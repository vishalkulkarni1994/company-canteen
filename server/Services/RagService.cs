using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;

namespace CanteenApi.Services;

public class RagService(IServiceScopeFactory scopeFactory, EmbeddingService embedding, ILogger<RagService> logger)
{
    public async Task<string> SearchAsync(string query, int companyId, int topK = 3, CancellationToken ct = default)
    {
        var queryVec = await embedding.EmbedAsync(query, ct);

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CanteenDbContext>();

        var chunks = await db.DocumentChunks
            .Where(c => c.CompanyId == companyId)
            .Select(c => new { c.Title, c.Content, c.Source, c.Embedding })
            .ToListAsync(ct);

        if (chunks.Count == 0)
        {
            logger.LogWarning("No document chunks found for CompanyId {CompanyId}", companyId);
            return "No knowledge base documents found for this company.";
        }

        var results = chunks
            .Select(c => new
            {
                c.Title,
                c.Content,
                c.Source,
                Score = CosineSimilarity(queryVec, EmbeddingService.DeserializeEmbedding(c.Embedding))
            })
            .OrderByDescending(r => r.Score)
            .Take(topK);

        return string.Join("\n\n", results.Select(r =>
            $"[{r.Source}: {r.Title}] (relevance: {r.Score:F2})\n{r.Content}"));
    }

    private static float CosineSimilarity(float[] a, float[] b)
    {
        float dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (MathF.Sqrt(normA) * MathF.Sqrt(normB));
    }
}
