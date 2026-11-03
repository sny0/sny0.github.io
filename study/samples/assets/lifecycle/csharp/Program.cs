using System;
using System.Globalization;

internal static class Program
{
    private static readonly byte[] ValidBytes = { 0x41, 0x53, 0x30, 0x31, 0x10, 0x20, 0x30, 0x40 };
    private enum State { Requested, Reading, CpuReady, Registering, Ready, Released, Failed, Cancelled }
    private enum Completion { Applied, Discarded, Rejected }
    private static int checks;
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
    private static void Check(bool condition, string label)
    {
        Require(condition, label);
        ++checks;
        Console.WriteLine($"check {label}: pass");
    }

    // Logical model tokens only: no engine registration or GPU allocation.
    private sealed class MockSink
    {
        private uint liveToken;
        public uint Created { get; private set; }
        public uint Released { get; private set; }
        public uint Live => liveToken == 0 ? 0U : 1U;
        public uint CreateModelToken()
        {
            Require(liveToken == 0, "MockSink already owns a token");
            Require(Created != uint.MaxValue, "Model token IDs exhausted");
            liveToken = ++Created;
            return liveToken;
        }
        public void ReleaseModelToken(uint token)
        {
            Require(token != 0 && token == liveToken, "Invalid/duplicate model token release");
            liveToken = 0;
            ++Released;
        }
    }

    // Single asset, deterministic injected events, no I/O, threads, decompressor or GPU.
    // Staging counters represent logical ownership, not actual managed/GPU memory.
    private sealed class AssetLifecycleModel
    {
        public const uint MaxPending = 1;
        public const uint StagingBudget = 8;
        private sealed class Slot
        {
            public ulong Id { get; }
            public byte[] Bytes { get; }
            public Slot(ulong id, byte[] bytes) { Id = id; Bytes = bytes; }
        }
        private Slot? read;
        private byte[]? cpu;
        private Slot? registration;
        private uint readyToken;
        private readonly MockSink sink = new MockSink();
        public State CurrentState { get; private set; } = State.Released;
        public ulong Generation { get; private set; }
        public uint Discarded { get; private set; }
        public uint Pending => (read is null ? 0U : 1U) + (registration is null ? 0U : 1U);
        public uint StagingBytes => (Pending + (cpu is null ? 0U : 1U)) * 8U;
        public uint Tokens => sink.Live;
        public uint Created => sink.Created;
        public uint Released => sink.Released;
        public bool ResourcesZero => Pending == 0 && StagingBytes == 0 && Tokens == 0;

        public ulong Request()
        {
            Require(CurrentState is State.Released or State.Failed or State.Cancelled,
                "An active request must first be cancelled or released");
            Require(Generation != ulong.MaxValue, "Generation exhausted");
            ++Generation;
            CurrentState = State.Requested; // One waiting request, no bytes reserved here.
            return Generation;
        }
        public bool TryBeginRead(ulong id)
        {
            if (id != Generation || CurrentState != State.Requested) return false;
            if (Pending >= MaxPending || StagingBytes + 8U > StagingBudget) return false;
            read = new Slot(id, new byte[8]);
            CurrentState = State.Reading;
            return true;
        }
        public Completion CompleteReadModel(ulong id, ReadOnlySpan<byte> bytes, bool succeeded = true)
        {
            if (read is null || read.Id != id) return Completion.Rejected;
            Slot completed = read;
            read = null; // Terminal completion event returns ownership of this read slot.
            if (id != Generation || CurrentState != State.Reading)
            {
                ++Discarded;
                return Completion.Discarded;
            }
            bool valid = bytes.Length == 8 && bytes[0] == 0x41 && bytes[1] == 0x53
                && bytes[2] == 0x30 && bytes[3] == 0x31;
            if (!succeeded || !valid)
            {
                CurrentState = State.Failed;
                return Completion.Applied;
            }
            bytes.CopyTo(completed.Bytes);
            cpu = completed.Bytes;
            CurrentState = State.CpuReady; // Length/magic only; no decompression performed.
            return Completion.Applied;
        }
        public bool TryBeginRegistrationModel(ulong id)
        {
            if (id != Generation || CurrentState != State.CpuReady || cpu is null) return false;
            registration = new Slot(id, cpu);
            cpu = null;
            CurrentState = State.Registering;
            return true;
        }
        public Completion CompleteRegistrationModel(ulong id, bool succeeded)
        {
            if (registration is null || registration.Id != id) return Completion.Rejected;
            registration = null; // Injected terminal event, not a cancellation request.
            uint token = succeeded ? sink.CreateModelToken() : 0;
            if (id != Generation || CurrentState != State.Registering)
            {
                if (token != 0) sink.ReleaseModelToken(token);
                ++Discarded;
                return Completion.Discarded;
            }
            if (!succeeded)
            {
                CurrentState = State.Failed;
                return Completion.Applied;
            }
            readyToken = token;
            CurrentState = State.Ready; // MockSink token, not actual GPU/engine readiness.
            return Completion.Applied;
        }
        public bool Cancel(ulong id)
        {
            if (id != Generation) return false;
            switch (CurrentState)
            {
                case State.Requested:
                case State.Reading:
                case State.Registering:
                    break; // Keep pending slot/data until a terminal completion event.
                case State.CpuReady:
                    cpu = null;
                    break;
                default:
                    return false;
            }
            CurrentState = State.Cancelled;
            return true;
        }
        public bool TryUse(ulong id) => id == Generation && CurrentState == State.Ready && readyToken != 0;
        public bool Release(ulong id)
        {
            if (id != Generation || CurrentState != State.Ready) return false;
            sink.ReleaseModelToken(readyToken);
            readyToken = 0;
            CurrentState = State.Released;
            return true;
        }
    }

    private static ulong PrepareRegistration(AssetLifecycleModel model)
    {
        ulong id = model.Request();
        Require(model.TryBeginRead(id), "Read setup");
        Require(model.CompleteReadModel(id, ValidBytes) == Completion.Applied, "Read completion setup");
        Require(model.TryBeginRegistrationModel(id), "Registration setup");
        return id;
    }
    private static void RunScenarios()
    {
        var model = new AssetLifecycleModel();
        Console.WriteLine("AssetLifecycleModel: single-thread, injected events, MockSink only");
        Console.WriteLine($"budget: waiting_requests=1 pending_slots={AssetLifecycleModel.MaxPending} staging_bytes={AssetLifecycleModel.StagingBudget}");
        ulong id = model.Request();
        Check(model.CurrentState == State.Requested && !model.TryUse(id), "requested_not_usable");
        Check(model.TryBeginRead(id) && model.CurrentState == State.Reading
            && model.Pending == 1 && model.StagingBytes == 8 && !model.TryUse(id), "reading_owns_slot");
        Check(model.CompleteReadModel(id, ValidBytes) == Completion.Applied && model.CurrentState == State.CpuReady
            && model.Pending == 0 && model.StagingBytes == 8 && !model.TryUse(id), "validated_not_ready");
        Check(model.TryBeginRegistrationModel(id) && model.CurrentState == State.Registering
            && model.Pending == 1 && model.StagingBytes == 8 && !model.TryUse(id), "registering_not_ready");
        Check(model.CompleteRegistrationModel(id, true) == Completion.Applied && model.CurrentState == State.Ready
            && model.TryUse(id) && model.Tokens == 1 && model.StagingBytes == 0, "ready_owns_model_token");
        Check(model.Release(id) && model.CurrentState == State.Released && model.ResourcesZero, "release_clears_resources");
        Check(!model.Release(id), "duplicate_release_rejected");

        id = model.Request();
        Require(model.TryBeginRead(id), "Short fixture setup");
        Require(model.CompleteReadModel(id, new byte[] { 0x41, 0x53, 0x30 }) == Completion.Applied, "Short completion");
        Check(model.CurrentState == State.Failed && model.ResourcesZero && !model.TryUse(id), "short_payload_failed");
        id = model.Request();
        Require(model.TryBeginRead(id), "Magic fixture setup");
        byte[] badMagic = (byte[])ValidBytes.Clone();
        badMagic[0] = 0;
        Require(model.CompleteReadModel(id, badMagic) == Completion.Applied, "Magic completion");
        Check(model.CurrentState == State.Failed && model.ResourcesZero, "bad_magic_failed");
        id = model.Request();
        Require(model.TryBeginRead(id), "Read failure setup");
        Require(model.CompleteReadModel(id, ReadOnlySpan<byte>.Empty, false) == Completion.Applied, "Read failure completion");
        Check(model.CurrentState == State.Failed && model.ResourcesZero, "read_failure_reclaimed");
        id = PrepareRegistration(model);
        Require(model.CompleteRegistrationModel(id, false) == Completion.Applied, "Registration failure completion");
        Check(model.CurrentState == State.Failed && model.ResourcesZero, "registration_failure_reclaimed");

        ulong oldRead = model.Request();
        Require(model.TryBeginRead(oldRead), "Cancelled read setup");
        Check(model.Cancel(oldRead) && model.CurrentState == State.Cancelled && model.Pending == 1
            && model.StagingBytes == 8, "cancelled_read_keeps_slot");
        ulong nextRead = model.Request();
        Check(nextRead > oldRead && !model.TryBeginRead(nextRead) && model.CurrentState == State.Requested
            && model.Pending == 1 && model.StagingBytes == 8, "read_backpressure_waits");
        Check(model.CompleteReadModel(oldRead, ValidBytes) == Completion.Discarded
            && model.Generation == nextRead && model.CurrentState == State.Requested
            && model.ResourcesZero, "stale_read_reclaimed");
        Require(model.TryBeginRead(nextRead), "Resume read");
        Require(model.CompleteReadModel(nextRead, ValidBytes) == Completion.Applied, "Resume completion");
        Check(model.Cancel(nextRead) && model.CurrentState == State.Cancelled && model.ResourcesZero, "cpu_cancel_reclaims");

        ulong oldRegistration = PrepareRegistration(model);
        Check(model.Cancel(oldRegistration) && model.Pending == 1 && model.StagingBytes == 8,
            "cancelled_registration_keeps_data");
        ulong nextRegistration = model.Request();
        Check(nextRegistration > oldRegistration && !model.TryBeginRead(nextRegistration)
            && model.CurrentState == State.Requested, "registration_backpressure_waits");
        uint createdBefore = model.Created;
        uint releasedBefore = model.Released;
        Check(model.CompleteRegistrationModel(oldRegistration, true) == Completion.Discarded
            && model.CurrentState == State.Requested && model.ResourcesZero
            && model.Created == createdBefore + 1 && model.Released == releasedBefore + 1,
            "stale_registration_token_released");
        Require(model.TryBeginRead(nextRegistration), "Final read setup");
        Require(model.CompleteReadModel(nextRegistration, ValidBytes) == Completion.Applied, "Final read completion");
        Require(model.TryBeginRegistrationModel(nextRegistration), "Final registration setup");
        Require(model.CompleteRegistrationModel(nextRegistration, true) == Completion.Applied, "Final registration completion");
        Check(!model.TryUse(oldRegistration) && model.TryUse(nextRegistration), "generation_guards_use");
        Check(model.Release(nextRegistration) && model.ResourcesZero, "final_owner_releases");
        id = model.Request();
        Check(model.Cancel(id) && model.ResourcesZero, "waiting_cancel_has_no_bytes");
        Check(model.CompleteReadModel(id, ValidBytes) == Completion.Rejected && model.ResourcesZero,
            "unowned_completion_rejected");
        Check(model.ResourcesZero && model.Created == 3 && model.Released == 3 && model.Discarded == 2,
            "all_resources_zero");
        Console.WriteLine($"final: pending={model.Pending} staging_bytes={model.StagingBytes} model_tokens={model.Tokens} created={model.Created} released={model.Released} discarded={model.Discarded}");
    }
    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            RunScenarios();
            Console.WriteLine($"PASS: {checks} checks");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
