using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace AudioGuide.Business;

public class FallbackSpeechService(IConfiguration config, IHttpClientFactory clients)
{
    // Bound concurrent synthesis and avoid generating the same file twice.
    private static readonly SemaphoreSlim Gate = new(1, 1);

    public async Task<string> Generate(NarrationDto narration)
    {
        var endpoint = config["TTS_SERVICE_URL"];
        if (string.IsNullOrWhiteSpace(endpoint))
            throw new AppError(503, "Chưa cấu hình dịch vụ giọng đọc dự phòng");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"gtts-v1:{narration.LanguageCode}:{narration.NarrationText}"))).ToLowerInvariant();
        var file = $"tts-{hash}.mp3";
        var root = config["MEDIA_PATH"] ?? "media";
        var path = Path.Combine(root, file);
        await Gate.WaitAsync();
        try
        {
            if (!File.Exists(path))
            {
                // Buffer JSON so HttpClient sends Content-Length. The Python service
                // reads a fixed-length body and does not decode chunked requests.
                using var body = new StringContent(JsonSerializer.Serialize(new { text = narration.NarrationText, lang = narration.LanguageCode }), Encoding.UTF8, "application/json");
                using var response = await clients.CreateClient().PostAsync(endpoint.TrimEnd('/') + "/synthesize", body);
                if (response.StatusCode == System.Net.HttpStatusCode.BadRequest)
                    throw new AppError(400, "Dịch vụ giọng đọc không hỗ trợ ngôn ngữ hoặc nội dung này");
                if (!response.IsSuccessStatusCode)
                    throw new AppError(502, "Không tạo được giọng đọc. Vui lòng thử lại sau.");
                var bytes = await response.Content.ReadAsByteArrayAsync();
                if (bytes.Length < 12 || response.Content.Headers.ContentType?.MediaType != "audio/mpeg")
                    throw new AppError(502, "Dịch vụ giọng đọc trả về audio không hợp lệ");
                Directory.CreateDirectory(root);
                var temporary = path + ".tmp";
                try
                {
                    await File.WriteAllBytesAsync(temporary, bytes);
                    File.Move(temporary, path, true);
                }
                finally { if (File.Exists(temporary)) File.Delete(temporary); }
            }
            return "/media/" + file;
        }
        catch (HttpRequestException) { throw new AppError(503, "Dịch vụ giọng đọc chưa sẵn sàng. Vui lòng thử lại."); }
        catch (TaskCanceledException) { throw new AppError(504, "Tạo giọng đọc quá thời gian chờ. Vui lòng thử lại."); }
        finally { Gate.Release(); }
    }
}
