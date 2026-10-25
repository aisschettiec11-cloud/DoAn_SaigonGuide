using AudioGuide.Business;
using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Xunit;

namespace AudioGuide.Tests;

public class FallbackSpeechTests
{
    [Theory]
    [InlineData("vi")]
    [InlineData("en")]
    [InlineData("ko")]
    [InlineData("ja")]
    [InlineData("zh")]
    [InlineData("th")]
    [InlineData("fr")]
    public async Task GeneratesAndReusesCachedAudio(string lang)
    {
        var root = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        try
        {
            var content = new ByteArrayContent(Encoding.ASCII.GetBytes("ID3test-speech-audio"));
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg");
            var service = new FallbackSpeechService(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["TTS_SERVICE_URL"] = "http://tts:8080", ["MEDIA_PATH"] = root
            }).Build(), new FixedLengthHttp(lang, new HttpResponseMessage(HttpStatusCode.OK) { Content = content }));
            var n = new NarrationDto(1, 1, 1, lang, lang, "Name", "", "Xin chào สวัสดี", "", null, false);
            var url = await service.Generate(n);
            Assert.Equal(url, await service.Generate(n));
            Assert.Single(Directory.GetFiles(root));
            Assert.Equal("ID3test-speech-audio", await File.ReadAllTextAsync(Path.Combine(root, Path.GetFileName(url))));
        }
        finally { if (Directory.Exists(root)) Directory.Delete(root, true); }
    }

    private sealed class FixedLengthHttp(string lang, HttpResponseMessage response) : HttpMessageHandler, IHttpClientFactory
    {
        private int calls;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        {
            Assert.Equal(1, ++calls);
            Assert.NotNull(request.Content);
            // Assert before reading: streaming JsonContent has no Content-Length.
            var length = request.Content.Headers.ContentLength;
            Assert.NotNull(length);
            var bytes = await request.Content.ReadAsByteArrayAsync(token);
            Assert.Equal((long)bytes.Length, length!.Value);
            using var json = JsonDocument.Parse(bytes);
            Assert.Equal(lang, json.RootElement.GetProperty("lang").GetString());
            Assert.Equal("Xin chào สวัสดี", json.RootElement.GetProperty("text").GetString());
            return response;
        }
        public HttpClient CreateClient(string name) => new(this, false);
    }
}
