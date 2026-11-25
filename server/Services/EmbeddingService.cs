using System.Text;
using System.Text.Json;

namespace CanteenApi.Services;

public class EmbeddingService(IHttpClientFactory httpFactory, IConfiguration config, ILogger<EmbeddingService> logger)
{
    private readonly string _endpoint = config["AzureOpenAI:Endpoint"]
        ?? throw new InvalidOperationException("AzureOpenAI:Endpoint is not configured.");
    private readonly string _apiKey = config["AzureOpenAI:ApiKey"]
        ?? throw new InvalidOperationException("AzureOpenAI:ApiKey is not configured.");
    private readonly string _deployment = config["AzureOpenAI:EmbeddingDeployment"] ?? "text-embedding-3-large";

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var results = await EmbedBatchAsync([text], ct);
        return results[0];
    }

    public async Task<List<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (texts.Count == 0) return [];

        var url = $"{_endpoint.TrimEnd('/')}/openai/deployments/{_deployment}/embeddings?api-version=2024-06-01";
        var payload = JsonSerializer.Serialize(new { input = texts });

        using var client = httpFactory.CreateClient();
        client.DefaultRequestHeaders.Add("api-key", _apiKey);

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var response = await client.PostAsync(url, content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Embedding API failed: {Status} {Body}", response.StatusCode, body);
            throw new HttpRequestException($"Embedding API returned {response.StatusCode}: {body}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        return json.GetProperty("data").EnumerateArray()
            .OrderBy(d => d.GetProperty("index").GetInt32())
            .Select(d => d.GetProperty("embedding").EnumerateArray()
                .Select(v => v.GetSingle()).ToArray())
            .ToList();
    }

    public static byte[] SerializeEmbedding(float[] embedding)
    {
        var bytes = new byte[embedding.Length * sizeof(float)];
        Buffer.BlockCopy(embedding, 0, bytes, 0, bytes.Length);
        return bytes;
    }

    public static float[] DeserializeEmbedding(byte[] bytes)
    {
        var floats = new float[bytes.Length / sizeof(float)];
        Buffer.BlockCopy(bytes, 0, floats, 0, bytes.Length);
        return floats;
    }
}
