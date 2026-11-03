using System;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Threading;

internal static class Program
{
    private const int InitialStock = 17;
    private const int WorkerCount = 4;
    private const int AttemptsPerWorker = 10;
    private static int checks;

    private readonly struct InventorySnapshot
    {
        public int Remaining { get; }
        public int Consumed { get; }
        public InventorySnapshot(int remaining, int consumed)
        {
            Remaining = remaining;
            Consumed = consumed;
        }
    }

    private sealed class Inventory
    {
        // An object-typed lock uses Monitor, not System.Threading.Lock.EnterScope.
        private readonly object gate = new object();
        private int remaining;
        private int consumed;

        public Inventory(int initial)
        {
            if (initial < 0) throw new ArgumentOutOfRangeException(nameof(initial));
            remaining = initial;
        }

        public bool TryConsume()
        {
            lock (gate)
            {
                // Check and both updates form one critical section.
                if (remaining == 0) return false;
                --remaining;
                ++consumed;
                return true;
            }
        }

        public InventorySnapshot Snapshot()
        {
            lock (gate)
            {
                return new InventorySnapshot(remaining, consumed);
            }
        }
    }

    private sealed class WorkerResult
    {
        public int Successes;
        public int Failures;
        public int SnapshotChecks;
        public Exception? Error;
    }

    private static void Check(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
        ++checks; // Only the parent thread calls this function.
    }

    private static void RunWorker(Inventory inventory, WorkerResult result)
    {
        try
        {
            for (int attempt = 0; attempt < AttemptsPerWorker; ++attempt)
            {
                if (inventory.TryConsume()) ++result.Successes;
                else ++result.Failures;

                InventorySnapshot state = inventory.Snapshot();
                if (state.Remaining < 0 || state.Remaining + state.Consumed != InitialStock)
                    throw new InvalidOperationException("Worker snapshot invariant failed");
                ++result.SnapshotChecks;
            }
        }
        catch (Exception error)
        {
            result.Error = error;
        }
    }

    private static void CheckSingleThreadCases()
    {
        var empty = new Inventory(0);
        Check(!empty.TryConsume(), "Empty inventory must reject consumption");
        InventorySnapshot emptyState = empty.Snapshot();
        Check(emptyState.Remaining == 0 && emptyState.Consumed == 0, "Empty snapshot");

        var one = new Inventory(1);
        Check(one.TryConsume(), "First consumption must succeed");
        Check(!one.TryConsume(), "Second consumption must fail");
        InventorySnapshot oneState = one.Snapshot();
        Check(oneState.Remaining == 0 && oneState.Consumed == 1, "One-item snapshot");

        bool rejected = false;
        try
        {
            _ = new Inventory(-1);
        }
        catch (ArgumentOutOfRangeException)
        {
            rejected = true;
        }
        Check(rejected, "Negative initial stock must throw");
        Console.WriteLine("single_thread_cases: passed");
    }

    private static void ObserveWorkers()
    {
        var inventory = new Inventory(InitialStock);
        var results = new WorkerResult[WorkerCount];
        var workers = new Thread[WorkerCount];
        for (int index = 0; index < WorkerCount; ++index)
            results[index] = new WorkerResult();

        int started = 0;
        try
        {
            for (int index = 0; index < WorkerCount; ++index)
            {
                WorkerResult slot = results[index]; // One preallocated slot per worker.
                var worker = new Thread(() => RunWorker(inventory, slot));
                worker.IsBackground = false;
                workers[index] = worker;
                worker.Start();
                ++started;
            }
        }
        finally
        {
            // Construction/Start failure still joins every successfully started worker.
            // No worker waits for a start gate or a not-yet-created worker.
            for (int index = 0; index < started; ++index)
                workers[index].Join();
        }

        // Join completed before the parent reads any worker-owned result slot.
        int successes = 0;
        int failures = 0;
        int snapshotChecks = 0;
        for (int index = 0; index < WorkerCount; ++index)
        {
            WorkerResult result = results[index];
            if (result.Error is not null)
                throw new InvalidOperationException("Worker failed", result.Error);
            Check(result.Successes >= 0 && result.Failures >= 0
                && result.Successes + result.Failures == AttemptsPerWorker
                && result.SnapshotChecks == AttemptsPerWorker, "Worker result totals");
            successes += result.Successes;
            failures += result.Failures;
            snapshotChecks += result.SnapshotChecks;
            Console.WriteLine($"worker {index}: success={result.Successes} fail={result.Failures} snapshots={result.SnapshotChecks}");
        }

        InventorySnapshot finalState = inventory.Snapshot();
        Check(successes + failures == WorkerCount * AttemptsPerWorker, "Total attempts");
        Check(finalState.Remaining >= 0 && finalState.Remaining + finalState.Consumed == InitialStock,
            "Final invariant");
        Check(successes == InitialStock && failures == 23
            && finalState.Remaining == 0 && finalState.Consumed == successes,
            "Expected final inventory and success/failure counts");
        Console.WriteLine($"final: remaining={finalState.Remaining} consumed={finalState.Consumed} total_success={successes} total_fail={failures} total_attempts={successes + failures} snapshots={snapshotChecks}");
    }

    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Console.WriteLine(RuntimeInformation.FrameworkDescription);
            Console.WriteLine($"inventory synchronization: initial={InitialStock} workers={WorkerCount} attempts_per_worker={AttemptsPerWorker}");
            CheckSingleThreadCases();
            ObserveWorkers();
            Console.WriteLine($"PASS: {checks} parent checks; 40 worker snapshots validated");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
