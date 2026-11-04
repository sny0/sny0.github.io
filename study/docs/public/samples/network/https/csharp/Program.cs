using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Security;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Threading;
using System.Threading.Tasks;

internal static class Program
{
    private const int BodyLimit = 64 * 1024;

    private sealed class TlsObservations : IDisposable
    {
        private readonly object gate = new();
        private readonly List<X509Certificate> certificates = new();
        private readonly List<string> snapshots = new();
        private bool disposed;

        public ValueTask<Stream> Observe(SocketsHttpPlaintextStreamFilterContext context,
                                        CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            // The handler owns this stream: do not read, replace or dispose it.
            if (context.PlaintextStream is SslStream tls)
            {
                lock (gate)
                {
                    if (disposed) { throw new ObjectDisposedException(nameof(TlsObservations)); }
                    X509Certificate? certificate = tls.RemoteCertificate;
                    // RemoteCertificate transfers certificate disposal responsibility.
                    // Keep it alive until the HTTP client/handler have been disposed.
                    if (certificate is not null &&
                        !certificates.Exists(item => ReferenceEquals(item, certificate)))
                    {
                        certificates.Add(certificate);
                    }
                    if (!tls.IsAuthenticated || !tls.IsEncrypted || certificate is null)
                    {
                        throw new InvalidOperationException("unexpected_tls_state");
                    }
                    string cipher;
                    try { cipher = tls.NegotiatedCipherSuite.ToString(); }
                    catch (PlatformNotSupportedException) { cipher = "unavailable"; }
                    snapshots.Add($"tls_info=available protocol={tls.SslProtocol} " +
                        $"cipher_suite={cipher} negotiated_http={context.NegotiatedHttpVersion}\n" +
                        $"peer_certificate_sha256={certificate.GetCertHashString(HashAlgorithmName.SHA256)}");
                }
            }
            else
            {
                lock (gate)
                {
                    if (disposed) { throw new ObjectDisposedException(nameof(TlsObservations)); }
                    snapshots.Add("tls_info=unavailable reason=not_sslstream");
                }
            }
            return ValueTask.FromResult(context.PlaintextStream);
        }

        public void Print()
        {
            lock (gate)
            {
                Console.WriteLine($"tls_observation_callbacks={snapshots.Count}");
                foreach (string snapshot in snapshots) { Console.WriteLine(snapshot); }
            }
        }

        public void Dispose()
        {
            lock (gate)
            {
                disposed = true;
                foreach (X509Certificate certificate in certificates) { certificate.Dispose(); }
                certificates.Clear();
            }
        }
    }

    private static async Task<int> RunLiveAsync()
    {
        Stopwatch elapsed = Stopwatch.StartNew();
        // Declaration order keeps observed certificates alive beyond handler disposal.
        using TlsObservations observations = new();
        using SocketsHttpHandler handler = new()
        {
            AllowAutoRedirect = false,
            AutomaticDecompression = DecompressionMethods.None,
            UseCookies = false,
            Credentials = null,
            DefaultProxyCredentials = null,
            ConnectTimeout = TimeSpan.FromSeconds(8),
            PlaintextStreamFilter = observations.Observe
        };
        // No certificate-validation callback, protocol override or custom trust.
        using HttpClient client = new(handler, disposeHandler: false)
        {
            Timeout = Timeout.InfiniteTimeSpan
        };
        using CancellationTokenSource cancellation = new(TimeSpan.FromSeconds(30));
        using HttpRequestMessage request = new(HttpMethod.Get, "https://example.com/")
        {
            Version = HttpVersion.Version11,
            VersionPolicy = HttpVersionPolicy.RequestVersionExact
        };
        request.Headers.UserAgent.ParseAdd("Sny0StudyHttpsObservation/1.0");
        Console.WriteLine("mode=live target=https://example.com/ api=HttpClient");
        Console.WriteLine("certificate_validation=platform_default_no_override");
        Console.WriteLine($"revocation_policy={handler.SslOptions.CertificateRevocationCheckMode}");
        using HttpResponseMessage response = await client.SendAsync(request,
            HttpCompletionOption.ResponseHeadersRead, cancellation.Token).ConfigureAwait(false);
        Console.WriteLine($"api_status=response_headers http_version={response.Version} " +
                          $"http_status={(int)response.StatusCode}");
        observations.Print();
        if (response.Version != HttpVersion.Version11)
        {
            throw new InvalidOperationException("unexpected_http_version");
        }
        using Stream body = await response.Content.ReadAsStreamAsync(cancellation.Token).ConfigureAwait(false);
        byte[] buffer = new byte[4096];
        int total = 0;
        int reads = 0;
        while (true)
        {
            // Read one extra byte to detect a body exceeding the cap.
            int requested = Math.Min(buffer.Length, BodyLimit - total + 1);
            int received = await body.ReadAsync(buffer.AsMemory(0, requested), cancellation.Token)
                                     .ConfigureAwait(false);
            ++reads;
            if (received < 0 || received > requested)
            {
                throw new InvalidOperationException("invalid_read_count");
            }
            if (received > BodyLimit - total)
            {
                throw new InvalidOperationException("body_limit_exceeded");
            }
            total += received;
            if (received == 0) { break; }
        }
        Console.WriteLine($"api_status=response_complete body_bytes={total} body_limit={BodyLimit} " +
                          $"read_calls={reads} elapsed_ms={elapsed.ElapsedMilliseconds}");
        Console.WriteLine($"http_success={response.IsSuccessStatusCode.ToString().ToLowerInvariant()}");
        return response.IsSuccessStatusCode ? 0 : 1;
    }

    private static async Task<int> Main(string[] args)
    {
        if (args.Length == 0)
        {
            Console.WriteLine("usage: HttpsObservation --live");
            Console.WriteLine("target=https://example.com/ network_request=not_started");
            return 0;
        }
        if (args.Length != 1 || args[0] != "--live")
        {
            Console.Error.WriteLine("error=invalid_arguments expected=--live");
            return 2;
        }
        try
        {
            int result = await RunLiveAsync().ConfigureAwait(false);
            Console.WriteLine("caller_scope=finished");
            return result;
        }
        catch (OperationCanceledException exception)
        {
            Console.Error.WriteLine($"api_status=cancelled exception={exception.GetType().Name} " +
                                    "caller_scope=finished");
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"observation_status=failed exception={exception.GetType().Name} " +
                                    $"hresult=0x{exception.HResult:X8} caller_scope=finished");
        }
        return 1;
    }
}
