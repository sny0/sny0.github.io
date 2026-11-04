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
    private static readonly byte[] ExpectedBody = { 0x48, 0x54, 0x54, 0x50, 0x20, 0xE3, 0x81, 0x82, 0x0A };
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
            int requested = Math.Min(7, bytes.Length);
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
        int requested = Math.Min(7, bytes.Length);
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
    private static string Hex(ReadOnlySpan<byte> bytes) =>
        string.Join(" ", bytes.ToArray().Select(value => value.ToString("X2", CultureInfo.InvariantCulture)));
    private static void PrintStats(Stats stats) => Console.WriteLine(
        $"{stats.Name} totals: send_calls={stats.SendCalls} recv_calls={stats.RecvCalls} sent_bytes={stats.Sent} received_bytes={stats.Received} would_block={stats.WouldBlock}");


    private const int MaxHeader = 2048;
    private const int MaxBody = 64;
    private sealed class ParsedHeader
    {
        public string StartLine = "";
        public Dictionary<string, string> Fields = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }
    private static ParsedHeader ParseHeader(string text)
    {
        Require(text.Length <= MaxHeader && text.Length >= 4 && text.EndsWith("\r\n\r\n", StringComparison.Ordinal), "Header delimiter/limit");
        for (int i = 0; i < text.Length; ++i)
        {
            char c = text[i];
            if (c == '\r')
            {
                Require(i + 1 < text.Length && text[i + 1] == '\n', "Bare CR in header");
                ++i;
            }
            else Require(c >= 0x20 && c <= 0x7E, "Only ASCII header bytes and CRLF accepted");
        }
        int firstEnd = text.IndexOf("\r\n", StringComparison.Ordinal);
        Require(firstEnd > 0, "Missing start line");
        var parsed = new ParsedHeader { StartLine = text.Substring(0, firstEnd) };
        int position = firstEnd + 2;
        while (position < text.Length)
        {
            int end = text.IndexOf("\r\n", position, StringComparison.Ordinal);
            Require(end >= 0, "Missing CRLF");
            if (end == position)
            {
                Require(end + 2 == text.Length, "Bytes after header terminator");
                break;
            }
            string line = text.Substring(position, end - position);
            int colon = line.IndexOf(':');
            Require(colon > 0, "Missing header colon");
            string name = line.Substring(0, colon);
            foreach (char c in name) Require((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '-', "Subset field name");
            Require(!name.Equals("Transfer-Encoding", StringComparison.OrdinalIgnoreCase), "Transfer-Encoding outside this subset");
            string value = line.Substring(colon + 1).Trim(' ');
            Require(parsed.Fields.TryAdd(name, value), "Duplicate header outside this subset");
            position = end + 2;
        }
        return parsed;
    }
    private static string Field(ParsedHeader header, string name)
    {
        if (!header.Fields.TryGetValue(name, out string? value)) throw new InvalidOperationException("Required header absent");
        return value;
    }
    private static int ContentLength(string value)
    {
        Require(value.Length > 0, "Empty Content-Length");
        int length = 0;
        foreach (char c in value)
        {
            Require(c >= '0' && c <= '9', "Content-Length must be decimal digits");
            int digit = c - '0';
            Require(length <= (MaxBody - digit) / 10, "Content-Length exceeds body limit");
            length = length * 10 + digit;
        }
        return length;
    }
    private static bool DateShape(string value)
    {
        if (value.Length != 29 || value[3] != ',' || value[4] != ' ' || value[7] != ' '
            || value[11] != ' ' || value[16] != ' ' || value[19] != ':' || value[22] != ':'
            || value[25] != ' ' || value.Substring(26) != "GMT") return false;
        foreach (int i in new[] { 5, 6, 12, 13, 14, 15, 17, 18, 20, 21, 23, 24 })
            if (value[i] < '0' || value[i] > '9') return false;
        return true;
    }
    private sealed class BufferedReader
    {
        private readonly Socket socket;
        private readonly Stats stats;
        private readonly Deadline deadline;
        private readonly List<byte> pending = new List<byte>();
        private bool first = true;
        public BufferedReader(Socket socket, Stats stats, Deadline deadline)
        { this.socket = socket; this.stats = stats; this.deadline = deadline; }
        public bool Empty => pending.Count == 0;
        public string ReadHeader()
        {
            for (;;)
            {
                int found = -1;
                for (int i = 0; i + 3 < pending.Count; ++i)
                    if (pending[i] == 13 && pending[i + 1] == 10 && pending[i + 2] == 13 && pending[i + 3] == 10)
                    { found = i; break; }
                if (found >= 0)
                {
                    int size = found + 4;
                    Require(size <= MaxHeader, "Header exceeds limit");
                    // Preserve every octet one-to-one; ParseHeader rejects non-ASCII/control values.
                    string header = new string(pending.Take(size).Select(value => (char)value).ToArray());
                    pending.RemoveRange(0, size);
                    Console.WriteLine($"{stats.Name} header_bytes={size} carried_body_bytes={pending.Count}");
                    return header;
                }
                Require(pending.Count <= MaxHeader, "Header exceeds limit");
                Fill();
            }
        }
        public byte[] ReadBody(int size)
        {
            Require(size >= 0 && size <= MaxBody, "Body exceeds limit");
            var output = new List<byte>(size);
            while (output.Count < size)
            {
                if (pending.Count == 0) Fill();
                int count = Math.Min(size - output.Count, pending.Count);
                output.AddRange(pending.GetRange(0, count));
                pending.RemoveRange(0, count);
            }
            return output.ToArray();
        }
        public bool ReceiveEof()
        {
            Require(Empty, "Unexpected bytes after fixed HTTP message");
            return ReceiveSome(socket, new byte[7], stats, deadline) == 0;
        }
        private void Fill()
        {
            byte[] bytes = new byte[7];
            int requested = first ? 6 : 7; // Application chunking, not TCP packet segmentation.
            first = false;
            int actual = ReceiveSome(socket, bytes.AsSpan(0, requested), stats, deadline);
            Require(actual > 0, "EOF inside HTTP header/body");
            for (int i = 0; i < actual; ++i) pending.Add(bytes[i]);
        }
    }
    private static void RejectedInMemory(Action action, string label)
    {
        bool rejected = false;
        try { action(); } catch (InvalidOperationException) { rejected = true; }
        Check(rejected, label);
    }
    private static void ParserChecks()
    {
        ParsedHeader mixed = ParseHeader("HTTP/1.1 200 OK\r\ncOnTeNt-LeNgTh: 9\r\n\r\n");
        Check(ContentLength(Field(mixed, "content-length")) == 9, "Case-insensitive field name");
        RejectedInMemory(() => { _ = ParseHeader("HTTP/1.1 200 OK\r\nContent-Length: 9\r\ncontent-length: 9\r\n\r\n"); }, "Duplicate CL rejected");
        RejectedInMemory(() => { _ = ParseHeader("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n"); }, "TE outside subset");
        RejectedInMemory(() => { _ = ParseHeader("HTTP/1.1 200 OK\nContent-Length: 9\r\n\r\n"); }, "Bare LF outside subset");
        RejectedInMemory(() => { _ = ContentLength("+9"); }, "Nondecimal CL rejected");
        RejectedInMemory(() => { _ = ContentLength("65"); }, "Oversize body rejected");
    }
    private static SafeHandle[] RunCase(Deadline deadline)
    {
        ParserChecks();
        using var listener = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        listener.Blocking = false;
        listener.ExclusiveAddressUse = true;
        listener.Bind(new IPEndPoint(IPAddress.Loopback, 0));
        listener.Listen(1);
        IPEndPoint address = Endpoint(listener);
        Check(address.Address.Equals(IPAddress.Loopback) && address.Port != 0, "Loopback endpoint");
        Console.WriteLine($"listener=127.0.0.1:{address.Port} deadline_seconds=8");
        using var client = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
        client.Blocking = false;
        ConnectSelf(client, address, deadline);
        using var server = AcceptSelf(listener, deadline);
        server.Blocking = false;
        Check(Endpoint(server, true).Equals(Endpoint(client)) && Endpoint(server).Equals(address), "Self-client endpoints");
        var clientStats = new Stats("client");
        var serverStats = new Stats("server");
        var serverReader = new BufferedReader(server, serverStats, deadline);
        var clientReader = new BufferedReader(client, clientStats, deadline);
        string host = $"127.0.0.1:{address.Port}";
        string request = $"GET /study-demo HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n";
        byte[] requestBytes = request.Select(c => (byte)c).ToArray();
        SendAll(client, requestBytes, clientStats, deadline);
        ParsedHeader requestHeader = ParseHeader(serverReader.ReadHeader());
        Check(requestHeader.StartLine == "GET /study-demo HTTP/1.1" && requestHeader.Fields.Count == 2
            && Field(requestHeader, "host") == host && Field(requestHeader, "connection").Equals("close", StringComparison.OrdinalIgnoreCase), "Fixed request header");
        Check(serverReader.Empty, "No carried request body");
        Console.WriteLine($"server request_valid=true host={host} request_body_bytes=0");
        string date = DateTimeOffset.UtcNow.ToString("r", CultureInfo.InvariantCulture);
        string responseHeader = "HTTP/1.1 200 OK\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: 9\r\nConnection: close\r\nDate: " + date + "\r\n\r\n";
        var response = new List<byte>(responseHeader.Select(c => (byte)c));
        response.AddRange(new byte[] { 0x48, 0x54, 0x54, 0x50, 0x20 });
        response.AddRange(new byte[] { 0xE3, 0x81, 0x82, 0x0A });
        SendAll(server, response.ToArray(), serverStats, deadline);
        server.Shutdown(SocketShutdown.Send);
        ParsedHeader parsed = ParseHeader(clientReader.ReadHeader());
        Check(parsed.StartLine == "HTTP/1.1 200 OK" && parsed.Fields.Count == 4
            && Field(parsed, "content-type") == "text/plain; charset=utf-8"
            && Field(parsed, "connection").Equals("close", StringComparison.OrdinalIgnoreCase), "Fixed response header");
        Check(DateShape(Field(parsed, "date")) && Field(parsed, "date") == date, "Generated UTC Date");
        int size = ContentLength(Field(parsed, "content-length"));
        Check(size == 9, "Content-Length counts body octets");
        byte[] body = clientReader.ReadBody(size);
        Check(body.SequenceEqual(ExpectedBody), "Exact body bytes");
        Check(clientReader.Empty, "No extra bytes after body");
        Console.WriteLine($"client status=200 content_length={size} body_bytes={body.Length} message_complete=true");
        Console.WriteLine($"client date={date}");
        Console.WriteLine($"client body_hex={Hex(body)}");
        Check(clientReader.ReceiveEof(), "Client connection-close EOF after complete message");
        Console.WriteLine("client response_eof=true");
        client.Shutdown(SocketShutdown.Send);
        Check(serverReader.ReceiveEof(), "Server request-direction EOF");
        Console.WriteLine("server request_eof=true");
        Check(clientStats.Sent == requestBytes.Length && serverStats.Received == requestBytes.Length
            && serverStats.Sent == response.Count && clientStats.Received == response.Count, "HTTP cumulative byte totals");
        PrintStats(clientStats); PrintStats(serverStats);
        return new SafeHandle[] { listener.SafeHandle, client.SafeHandle, server.SafeHandle };
    }
    private static int Main()
    {
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            var deadline = new Deadline();
            SafeHandle[] handles = RunCase(deadline);
            Check(handles.All(handle => handle.IsClosed), "All socket handles closed");
            deadline.Ensure();
            Check(true, "Common deadline satisfied");
            Console.WriteLine($"closed_sockets=3 live_sockets=0 readiness_waits={readinessWaits}");
            Console.WriteLine($"PASS: {checks} checks");
            return 0;
        }
        catch (SocketException error)
        {
            Console.Error.WriteLine($"FAIL: SocketException code={error.ErrorCode}"); return 1;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name); return 1;
        }
    }
}
