namespace CanteenApi.Models;

public class DocumentChunk
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;
    public required string Source { get; set; }
    public required string Title { get; set; }
    public required string Content { get; set; }
    public required byte[] Embedding { get; set; }
    public required string ContentHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
