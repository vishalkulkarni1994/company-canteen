using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;
using CanteenApi.Models;

namespace CanteenApi.Services;

public class RagIngestionService(
    IServiceScopeFactory scopeFactory,
    EmbeddingService embedding,
    ILogger<RagIngestionService> logger) : IHostedService
{
    private record SeedDocument(int CompanyId, string Title, string Content);

    public async Task StartAsync(CancellationToken ct)
    {
        try
        {
            var documents = LoadSeedDocuments();
            if (documents.Count == 0)
            {
                logger.LogWarning("No seed documents found for RAG ingestion.");
                return;
            }

            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CanteenDbContext>();

            var newDocs = await FilterAlreadyIngested(db, documents, ct);
            if (newDocs.Count == 0)
            {
                logger.LogInformation("All {Total} documents already ingested, nothing to do.", documents.Count);
                return;
            }

            logger.LogInformation("Ingesting {New} new documents (of {Total} total).", newDocs.Count, documents.Count);

            var texts = newDocs.Select(d => d.Content).ToList();
            var embeddings = await EmbedInBatches(texts, batchSize: 16, ct);

            for (int i = 0; i < newDocs.Count; i++)
            {
                var doc = newDocs[i];
                db.DocumentChunks.Add(new DocumentChunk
                {
                    CompanyId = doc.CompanyId,
                    Source = doc.Title.Contains("Policy") || doc.Title.Contains("Hours")
                        || doc.Title.Contains("Hygiene") || doc.Title.Contains("Payment")
                        || doc.Title.Contains("Sustainability") || doc.Title.Contains("Cancellation")
                        ? "policy" : "recipe",
                    Title = doc.Title,
                    Content = doc.Content,
                    Embedding = EmbeddingService.SerializeEmbedding(embeddings[i]),
                    ContentHash = ComputeHash(doc.Content)
                });
            }

            await db.SaveChangesAsync(ct);
            logger.LogInformation("Successfully ingested {Count} document chunks.", newDocs.Count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "RAG ingestion failed. The app will continue without RAG.");
        }
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;

    private List<SeedDocument> LoadSeedDocuments()
    {
        var basePath = Path.Combine(AppContext.BaseDirectory, "Data", "SeedData");
        var documents = new List<SeedDocument>();

        foreach (var file in new[] { "recipes.json", "policies.json" })
        {
            var path = Path.Combine(basePath, file);
            if (!File.Exists(path))
            {
                logger.LogWarning("Seed file not found: {Path}", path);
                continue;
            }

            var json = File.ReadAllText(path);
            var items = JsonSerializer.Deserialize<List<SeedDocument>>(json, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            if (items != null)
                documents.AddRange(items);
        }

        return documents;
    }

    private static async Task<List<SeedDocument>> FilterAlreadyIngested(
        CanteenDbContext db, List<SeedDocument> documents, CancellationToken ct)
    {
        var existingHashes = await db.DocumentChunks
            .Select(c => c.ContentHash)
            .ToListAsync(ct);

        var hashSet = new HashSet<string>(existingHashes);

        return documents
            .Where(d => !hashSet.Contains(ComputeHash(d.Content)))
            .ToList();
    }

    private async Task<List<float[]>> EmbedInBatches(
        List<string> texts, int batchSize, CancellationToken ct)
    {
        var allEmbeddings = new List<float[]>();

        for (int i = 0; i < texts.Count; i += batchSize)
        {
            var batch = texts.Skip(i).Take(batchSize).ToList();
            logger.LogInformation("Embedding batch {Start}-{End} of {Total}",
                i + 1, Math.Min(i + batchSize, texts.Count), texts.Count);

            var batchEmbeddings = await embedding.EmbedBatchAsync(batch, ct);
            allEmbeddings.AddRange(batchEmbeddings);
        }

        return allEmbeddings;
    }

    private static string ComputeHash(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(bytes);
    }
}
