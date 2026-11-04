using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;

internal static class Program
{
    private static readonly byte[] Wire =
        { 0x00, 0x06, 0x41, 0x42, 0x00, 0xE3, 0x81, 0x82, 0x00, 0x04, 0x10, 0x20, 0x30, 0x40 };
    private static readonly byte[] FirstBody = { 0x41, 0x42, 0x00, 0xE3, 0x81, 0x82 };
    private static readonly byte[] SecondBody = { 0x10, 0x20, 0x30, 0x40 };
    private static readonly byte[] ApplicationAck = { 0x4F, 0x4B, 0x00, 0x01 };
    private static int checks;
    private static int readinessWaits;
    private static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }
    private static void Check(bool condition, string label) { Require(condition, label); ++checks; }

    private sealed class Deadline
    {
        private readonly long end = checked(Stopwatch.GetTimestamp() + 8L * Stopwatch.Frequency);
        public void Ensure() { _ = RemainingMicroseconds(); }
        public int RemainingMicroseconds()
        {
            long remaining = end - Stopwatch.GetTimestamp();
            if (remaining <= 0) throw new TimeoutException("Common I/O deadline expired");
            double microseconds = Math.Ceiling(remaining * (1_000_000.0 / Stopwatch.Frequency));
            return (int)Math.Clamp(microseconds, 1.0, int.MaxValue);
        }
    }
    private static int SocketErrorCode(Socket socket)
    {
        object value = socket.GetSocketOption(SocketOptionLevel.Socket, SocketOptionName.Error)
            ?? throw new InvalidOperationException("SO_ERROR unavailable");
        return (int)value;
    }
    private static void WaitReady(Socket socket, bool writing, Deadline deadline)
    {
        var ready = new List<Socket> { socket };
        var errors = new List<Socket> { socket };
        ++readinessWaits;
        Socket.Select(writing ? null : ready, writing ? ready : null, errors, deadline.RemainingMicroseconds());
        if (errors.Count != 0)
        {
            int code = SocketErrorCode(socket);
            if (code != 0) throw new SocketException(code);
            throw new InvalidOperationException("Unexpected exceptional socket readiness");
        }
        if (ready.Count == 0) throw new TimeoutException("Common I/O deadline timed out");
    }
    private static IPEndPoint Endpoint(Socket socket, bool peer = false) =>
        (peer ? socket.RemoteEndPoint : socket.LocalEndPoint) as IPEndPoint
        ?? throw new InvalidOperationException("IPv4 endpoint unavailable");
    private static void ConnectSelf(Socket client, IPEndPoint address, Deadline deadline)
    {
        deadline.Ensure();
        try { client.Connect(address); }
        catch (SocketException error) when (error.SocketErrorCode == SocketError.WouldBlock)
        {
            WaitReady(client, writing: true, deadline);
        }
        int code = SocketErrorCode(client);
        if (code != 0) throw new SocketException(code);
        // Update/check the just-established managed connection state, not peer liveness/EOF.
        Require(client.Connected, "Connect did not establish a connection");
    }
    private static Socket AcceptSelf(Socket listener, Deadline deadline)
    {
        for (;;)
        {
            deadline.Ensure();
            try { return listener.Accept(); }
            catch (SocketException error) when (error.SocketErrorCode == SocketError.WouldBlock)
            {
                WaitReady(listener, writing: false, deadline);
            }
        }
    }
    private sealed class Stats
    {
        public string Name { get; }
        public int SendCalls, RecvCalls, Sent, Received, WouldBlock;
        public Stats(string name) { Name = name; }
    }
    private static void SendAll(Socket socket, ReadOnlySpan<byte> bytes, Stats stats, Deadline deadline)
    {
        while (!bytes.IsEmpty)
        {
            deadline.Ensure();
            int requested = Math.Min(3, bytes.Length);
            int actual;
            ++stats.SendCalls;
            try { actual = socket.Send(bytes.Slice(0, requested), SocketFlags.None); }
            catch (SocketException error) when (error.SocketErrorCode == SocketError.WouldBlock)
            {
                ++stats.WouldBlock;
                WaitReady(socket, writing: true, deadline);
                continue;
            }
            Require(actual > 0 && actual <= requested, "Invalid send progress");
            stats.Sent += actual;
            Console.WriteLine($"{stats.Name} send requested={requested} actual={actual}");
            bytes = bytes.Slice(actual);
        }
    }
    private static int ReceiveSome(Socket socket, Span<byte> bytes, Stats stats, Deadline deadline)
    {
        Require(!bytes.IsEmpty, "Receive request must be positive");
        int requested = Math.Min(3, bytes.Length);
        for (;;)
        {
            deadline.Ensure();
            int actual;
            ++stats.RecvCalls;
            try { actual = socket.Receive(bytes.Slice(0, requested), SocketFlags.None); }
            catch (SocketException error) when (error.SocketErrorCode == SocketError.WouldBlock)
            {
                ++stats.WouldBlock;
                WaitReady(socket, writing: false, deadline);
                continue;
            }
            Require(actual >= 0 && actual <= requested, "Receive bounds mismatch");
            stats.Received += actual;
            Console.WriteLine($"{stats.Name} recv requested={requested} actual={actual}");
            return actual; // Graceful EOF is zero; reset/timeout throws instead.
        }
    }
    private static void ReceiveExact(Socket socket, Span<byte> bytes, Stats stats, Deadline deadline)
    {
        while (!bytes.IsEmpty)
        {
            int actual = ReceiveSome(socket, bytes, stats, deadline);
            Require(actual != 0, "Unexpected EOF inside frame/ACK");
            bytes = bytes.Slice(actual);
        }
    }
    private static int DecodeLength(ReadOnlySpan<byte> header)
    {
        Require(header.Length == 2, "Length header must contain two bytes");
        int length = (header[0] << 8) | header[1];
        if (length > 8) throw new InvalidOperationException("Frame body length exceeds limit eight");
        return length;
    }
    private static string Hex(ReadOnlySpan<byte> bytes) =>
        string.Join(" ", bytes.ToArray().Select(value => value.ToString("X2", CultureInfo.InvariantCulture)));
    private static void PrintStats(Stats stats) => Console.WriteLine(
        $"{stats.Name} totals: send_calls={stats.SendCalls} recv_calls={stats.RecvCalls} sent_bytes={stats.Sent} received_bytes={stats.Received} would_block={stats.WouldBlock}");

    private static SafeHandle[] RunCase(Deadline deadline)
    {
        using var listener = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        listener.Blocking = false;
        listener.ExclusiveAddressUse = true;
        listener.Bind(new IPEndPoint(IPAddress.Loopback, 0));
        listener.Listen(1);
        IPEndPoint address = Endpoint(listener);
        Check(address.Address.Equals(IPAddress.Loopback) && address.Port != 0, "Loopback/port assignment");
        Console.WriteLine($"listener=127.0.0.1:{address.Port} deadline_seconds=8");
        using var client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        client.Blocking = false;
        ConnectSelf(client, address, deadline);
        using var server = AcceptSelf(listener, deadline);
        server.Blocking = false;
        Check(Endpoint(server, peer: true).Equals(Endpoint(client)) && Endpoint(server).Equals(address)
            && Endpoint(client, peer: true).Equals(address), "Accepted self-client endpoints");

        bool rejected = false;
        try { _ = DecodeLength(new byte[] { 0x00, 0x09 }); }
        catch (InvalidOperationException) { rejected = true; }
        Check(rejected, "Oversize length rejected in memory");
        var clientStats = new Stats("client");
        var serverStats = new Stats("server");
        SendAll(client, Wire, clientStats, deadline);
        client.Shutdown(SocketShutdown.Send);
        Console.WriteLine("client shutdown_send=complete");
        bool nulPreserved = false;
        for (int frame = 0; frame < 2; ++frame)
        {
            byte[] header = new byte[2];
            ReceiveExact(server, header, serverStats, deadline);
            int length = DecodeLength(header);
            byte[] expectedBody = frame == 0 ? FirstBody : SecondBody;
            Check(length == expectedBody.Length, "Big-endian frame length");
            byte[] body = new byte[8];
            Span<byte> payload = body.AsSpan(0, length);
            ReceiveExact(server, payload, serverStats, deadline);
            Check(payload.SequenceEqual(expectedBody), "Frame body bytes");
            if (frame == 0) nulPreserved = payload[2] == 0;
            Console.WriteLine($"server frame={frame + 1} length={length} hex={Hex(payload)}");
        }
        Check(nulPreserved, "Binary NUL preserved");
        byte[] eofBuffer = new byte[3];
        Check(ReceiveSome(server, eofBuffer, serverStats, deadline) == 0, "Server graceful EOF after client half-close");
        Console.WriteLine("server eof=true; reverse direction remains usable");
        SendAll(server, ApplicationAck, serverStats, deadline);
        server.Shutdown(SocketShutdown.Send);
        Console.WriteLine("server shutdown_send=complete");
        byte[] receivedAck = new byte[4];
        ReceiveExact(client, receivedAck, clientStats, deadline);
        Check(receivedAck.AsSpan().SequenceEqual(ApplicationAck), "Application ACK exact bytes");
        Console.WriteLine($"client application_ack hex={Hex(receivedAck)}");
        Check(ReceiveSome(client, eofBuffer, clientStats, deadline) == 0, "Client graceful EOF after server half-close");
        Console.WriteLine("client eof=true");
        Check(clientStats.Sent == 14 && serverStats.Received == 14
            && serverStats.Sent == 4 && clientStats.Received == 4, "Cumulative byte totals");
        PrintStats(clientStats); PrintStats(serverStats);
        // Save only managed SafeHandle references for post-using IsClosed checks.
        return new SafeHandle[] { listener.SafeHandle, client.SafeHandle, server.SafeHandle };
    }
    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            var deadline = new Deadline();
            SafeHandle[] handles = RunCase(deadline); // using disposes all sockets before returning.
            Check(handles.All(handle => handle.IsClosed), "All socket handles closed");
            deadline.Ensure();
            Check(true, "Common deadline satisfied");
            Console.WriteLine($"closed_sockets=3 live_sockets=0 readiness_waits={readinessWaits}");
            Console.WriteLine($"PASS: {checks} checks");
            return 0;
        }
        catch (SocketException error)
        {
            Console.Error.WriteLine($"FAIL: SocketException code={error.ErrorCode}");
            return 1;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
