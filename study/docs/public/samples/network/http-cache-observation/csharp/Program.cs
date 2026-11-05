using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

internal static class Program
{
    private const int BodyLimit = 4096;
    private static readonly byte[] Expected =
        { 0x43, 0x61, 0x63, 0x68, 0x65, 0x20, 0xe3, 0x81, 0x82, 0x0a };

    private sealed record Response(HttpStatusCode Status, string ETag, byte[] Body);

    private static void Expect(bool condition, string reason)
    {
        if (!condition) { throw new InvalidOperationException(reason); }
    }

    private static bool TryPort(string[] args, out int port)
    {
        port = 0;
        if (args.Length != 1 || args[0].Length == 0 || args[0].Length > 5) { return false; }
        foreach (char digit in args[0])
        {
            if (digit < '0' || digit > '9') { return false; }
            port = port * 10 + digit - '0';
        }
        return port >= 1 && port <= 65535;
    }

    private static async Task<Response> GetAsync(HttpClient client, Uri target,
                                                 string? validator, CancellationToken token)
    {
        using HttpRequestMessage request = new(HttpMethod.Get, target)
        {
            Version = HttpVersion.Version11,
            VersionPolicy = HttpVersionPolicy.RequestVersionExact
        };
        if (validator is not null)
        {
            Expect(request.Headers.TryAddWithoutValidation("If-None-Match", validator), "cannot_set_validator");
        }
        using HttpResponseMessage response = await client.SendAsync(request,
            HttpCompletionOption.ResponseHeadersRead, token).ConfigureAwait(false);
        Expect(response.Version == HttpVersion.Version11, "unexpected_http_version");
        string etag = response.Headers.ETag?.ToString() ?? throw new InvalidOperationException("missing_etag");
        Expect(response.Headers.CacheControl?.ToString() == "no-cache", "cache_control_mismatch");
        Expect(response.Headers.Date.HasValue, "missing_date");
        bool hasLength = response.Content.Headers.NonValidated.TryGetValues("Content-Length", out var lengths);
        if (response.StatusCode == HttpStatusCode.OK)
        {
            Expect(hasLength && lengths.ToString() == "10", "content_length_mismatch");
        }
        if (response.StatusCode == HttpStatusCode.NotModified)
        {
            Expect(!hasLength, "unexpected_304_content_length");
        }
        using Stream stream = await response.Content.ReadAsStreamAsync(token).ConfigureAwait(false);
        using MemoryStream bytes = new();
        byte[] buffer = new byte[512];
        int total = 0;
        while (true)
        {
            int requested = Math.Min(buffer.Length, BodyLimit - total + 1);
            int received = await stream.ReadAsync(buffer.AsMemory(0, requested), token).ConfigureAwait(false);
            Expect(received >= 0 && received <= requested && received <= BodyLimit - total, "body_limit_or_count_invalid");
            bytes.Write(buffer, 0, received);
            total += received;
            if (received == 0) { break; }
        }
        return new Response(response.StatusCode, etag, bytes.ToArray());
    }

    private static void Observe(int step, Response response, HttpStatusCode status,
                                bool reuse, byte[] effective)
    {
        Expect(response.Status == status, "unexpected_http_status");
        Expect(response.ETag == "\"study-v1\"", "unexpected_etag");
        Expect(status == HttpStatusCode.NotModified ? response.Body.Length == 0 : response.Body.SequenceEqual(Expected), "wire_body_mismatch");
        Expect(effective.SequenceEqual(Expected), "effective_cached_body_mismatch");
        Console.WriteLine($"step={step} status={(int)response.Status} received_body_bytes={response.Body.Length} " +
                          $"etag={response.ETag} reuse_saved_body={reuse.ToString().ToLowerInvariant()} " +
                          $"effective_body_bytes={effective.Length}");
    }

    private static async Task RunAsync(int port)
    {
        using SocketsHttpHandler handler = new()
        {
            UseProxy = false,
            AllowAutoRedirect = false,
            UseCookies = false,
            AutomaticDecompression = DecompressionMethods.None,
            Credentials = null,
            DefaultProxyCredentials = null,
            ConnectTimeout = TimeSpan.FromSeconds(8)
        };
        using HttpClient client = new(handler, disposeHandler: false)
        {
            Timeout = Timeout.InfiniteTimeSpan
        };
        // One cancellation budget covers all four SendAsync and body-read phases.
        using CancellationTokenSource budget = new(TimeSpan.FromSeconds(30));
        Uri target = new($"http://127.0.0.1:{port.ToString(CultureInfo.InvariantCulture)}/resource");
        Console.WriteLine($"target={target} cache_model=explicit_client_memory");
        Response first = await GetAsync(client, target, null, budget.Token).ConfigureAwait(false);
        byte[] cachedBody = first.Body;
        string cachedETag = first.ETag;
        Observe(1, first, HttpStatusCode.OK, false, cachedBody);
        Response second = await GetAsync(client, target, cachedETag, budget.Token).ConfigureAwait(false);
        Observe(2, second, HttpStatusCode.NotModified, true, cachedBody);
        Response third = await GetAsync(client, target, "\"other,tag\", W/" + cachedETag, budget.Token).ConfigureAwait(false);
        Observe(3, third, HttpStatusCode.NotModified, true, cachedBody);
        Response fourth = await GetAsync(client, target, "\"study-old\"", budget.Token).ConfigureAwait(false);
        cachedBody = fourth.Body;
        Observe(4, fourth, HttpStatusCode.OK, false, cachedBody);
        Console.WriteLine("observations=4 result=passed");
    }

    private static async Task<int> Main(string[] args)
    {
        if (!TryPort(args, out int port))
        {
            Console.Error.WriteLine("usage: HttpCacheObservation <port_1_to_65535>");
            return 2;
        }
        try
        {
            await RunAsync(port).ConfigureAwait(false);
            Console.WriteLine("caller_scope=finished");
            return 0;
        }
        catch (OperationCanceledException)
        {
            Console.Error.WriteLine("api_status=cancelled budget_seconds=30");
        }
        catch (HttpRequestException error)
        {
            Console.Error.WriteLine($"api_status=failed request_error={error.HttpRequestError} hresult=0x{error.HResult:X8}");
        }
        catch (Exception error)
        {
            Console.Error.WriteLine($"observation_status=failed exception={error.GetType().Name} reason={error.Message}");
        }
        return 1;
    }
}
