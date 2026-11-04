using System;
using System.Diagnostics;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;

internal static class Program
{
    private static async Task<bool> ObserveAsync(string input, string label, IPAddress? numeric, bool localhost)
    {
        // Eight seconds requests cancellation. Await still consumes terminal completion;
        // this is not a hard wall-clock limit or a claim that all OS work has stopped.
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(8));
        var stopwatch = Stopwatch.StartNew();
        bool completedAtCheck = false;
        IPAddress[] addresses;
        try
        {
            Task<IPAddress[]> request = Dns.GetHostAddressesAsync(input, AddressFamily.Unspecified, cancellation.Token);
            completedAtCheck = request.IsCompleted;
            addresses = await request.ConfigureAwait(false);
            stopwatch.Stop();
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();
            Console.WriteLine($"query={label} completed_at_check={Text(completedAtCheck)} api_status=cancelled code=OperationCanceledException cancel_requested={Text(cancellation.IsCancellationRequested)} elapsed_ms={stopwatch.Elapsed.TotalMilliseconds:F3}");
            return false;
        }
        catch (SocketException error)
        {
            stopwatch.Stop();
            string status = error.SocketErrorCode == SocketError.TimedOut ? "resolver_timeout" : "resolver_failure";
            Console.WriteLine($"query={label} completed_at_check={Text(completedAtCheck)} api_status={status} code={error.NativeErrorCode} cancel_requested={Text(cancellation.IsCancellationRequested)} elapsed_ms={stopwatch.Elapsed.TotalMilliseconds:F3}");
            return false;
        }
        Console.WriteLine($"query={label} completed_at_check={Text(completedAtCheck)} api_status=success code=0 cancel_requested={Text(cancellation.IsCancellationRequested)} elapsed_ms={stopwatch.Elapsed.TotalMilliseconds:F3}");
        bool allValid = true;
        foreach (IPAddress address in addresses)
        {
            bool valid = address.AddressFamily is AddressFamily.InterNetwork or AddressFamily.InterNetworkV6;
            allValid &= valid;
            string family = address.AddressFamily == AddressFamily.InterNetwork ? "IPv4"
                : address.AddressFamily == AddressFamily.InterNetworkV6 ? "IPv6" : "other";
            long scope = address.AddressFamily == AddressFamily.InterNetworkV6 ? address.ScopeId : 0;
            Console.WriteLine($"  address family={family} value={address} scope={scope} loopback={Text(IPAddress.IsLoopback(address))}");
        }
        bool numericMatch = numeric is null || addresses.All(address => address.AddressFamily == numeric.AddressFamily && address.Equals(numeric));
        bool hasLoopback = addresses.Any(IPAddress.IsLoopback);
        bool validResult = addresses.Length > 0 && allValid && numericMatch && (!localhost || hasLoopback);
        string numericText = numeric is null ? "n/a" : Text(numericMatch);
        Console.WriteLine($"result={label} addresses={addresses.Length} valid={Text(validResult)} has_loopback={Text(hasLoopback)} numeric_match={numericText}");
        return validResult;
    }
    private static string Text(bool value) => value ? "true" : "false";
    private static async Task<int> Main(string[] args)
    {
        bool live = args.Length == 1 && args[0] == "--live";
        if (args.Length != 0 && !live)
        {
            Console.Error.WriteLine("usage: NameResolutionObservation [--live]");
            return 2;
        }
        try
        {
            CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
            Console.WriteLine($"mode={(live ? "live" : "default")} cancel_request_deadline_seconds=8 per_query=true family=Unspecified");
            int succeeded = 0;
            int apiCalls = live ? 4 : 3;
            if (await ObserveAsync("127.0.0.1", "numeric_ipv4", IPAddress.Loopback, false)) ++succeeded;
            if (await ObserveAsync("::1", "numeric_ipv6", IPAddress.IPv6Loopback, false)) ++succeeded;
            if (await ObserveAsync("localhost", "localhost", null, true)) ++succeeded;
            if (live && await ObserveAsync("example.com.", "example.com.", null, false)) ++succeeded;
            Console.WriteLine($"summary api_calls={apiCalls} succeeded={succeeded} failed_or_cancelled={apiCalls - succeeded} caller_objects=released");
            if (succeeded != apiCalls) return 1;
            Console.WriteLine("PASS: address validation; no wire/cache/connect claim");
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("FAIL: " + error.GetType().Name);
            return 1;
        }
    }
}
