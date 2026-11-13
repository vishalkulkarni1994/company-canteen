using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using CanteenApi.Data;

namespace CanteenApi.Services;

public class AnalyticsService(IClaudeMessageClient client, IServiceScopeFactory scopeFactory, ILogger<AnalyticsService> logger)
{
    private const string DbSchema = """
        Tables:

        Companies (Id INT PK, Name TEXT, CreatedAt DATETIME)

        Users (Id INT PK, Email TEXT, Name TEXT, Role TEXT ['User','CompanyAdmin','SuperAdmin'], CompanyId INT FK→Companies NULL, CreatedAt DATETIME)

        MenuItems (Id INT PK, Name TEXT, Description TEXT, Price DECIMAL, Category TEXT, ImageUrl TEXT, IsActive BOOL, CompanyId INT FK→Companies, CreatedAt DATETIME, UpdatedAt DATETIME)

        DailyStocks (Id INT PK, MenuItemId INT FK→MenuItems, Date DATE, QuantityAvailable INT, QuantityOrdered INT)

        Orders (Id INT PK, UserId INT FK→Users, CompanyId INT FK→Companies, Status TEXT ['Placed','Preparing','Ready','Collected'], TotalAmount DECIMAL, CreatedAt DATETIME, UpdatedAt DATETIME)

        OrderItems (Id INT PK, OrderId INT FK→Orders, MenuItemId INT FK→MenuItems, Quantity INT, UnitPrice DECIMAL)
        """;

    private static ClaudeAgentDefinition BuildAgentDef(int? companyId) => new()
    {
        Model = "claude-haiku-5-5",
        MaxTokens = 512,
        SystemPrompt =
            "You are a SQL generator for a canteen database (SQLite).\n" +
            "Given a natural-language question, respond ONLY with a JSON object — no markdown, no explanation.\n\n" +
            "Schema:\n" + DbSchema + "\n\n" +
            (companyId.HasValue
                ? $"IMPORTANT: The current user belongs to CompanyId={companyId.Value}. ALL queries MUST filter by CompanyId={companyId.Value} to ensure data isolation. For MenuItems, Orders, and Users, always include WHERE CompanyId = {companyId.Value}. For DailyStocks, join with MenuItems and filter by MenuItems.CompanyId = {companyId.Value}.\n\n"
                : "The current user is a SuperAdmin with access to all companies. Include company context in results when relevant.\n\n") +
            "Response format (STRICT — no other keys):\n" +
            """
            {
              "sql": "SELECT ...",
              "chartType": "bar" | "pie" | "line" | "table",
              "title": "short human-readable title",
              "xLabel": "x-axis label (if chart)",
              "yLabel": "y-axis label (if chart)"
            }
            """ + "\n\n" +
            "Rules:\n" +
            "- SELECT only. Never write INSERT, UPDATE, DELETE, DROP, ALTER, or any DDL/DML.\n" +
            "- Use strftime for date filtering. Today is '" + DateTime.UtcNow.ToString("yyyy-MM-dd") + "'.\n" +
            "- \"this week\" = Monday to Sunday of the current week.\n" +
            "- Always alias computed columns clearly (e.g. AS total, AS count).\n" +
            "- For charts: first column = labels/x-axis, second column = values/y-axis.\n" +
            "- Pick the best chartType for the question.\n" +
            "- Keep queries simple and efficient.",
        Tools = []
    };

    public async Task<AnalyticsResult> QueryAsync(string question, int? companyId, CancellationToken ct = default)
    {
        ClaudeResponse response;
        try
        {
            response = await client.SendAsync(BuildAgentDef(companyId), [new { role = "user", content = question }], ct);
        }
        catch (Exception ex) when (ex.Message.Contains("API key") || ex.Message.Contains("401") || ex.Message.Contains("authentication"))
        {
            return new AnalyticsResult { Error = "AI is not configured. Set the Claude API key in appsettings.json." };
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "[Analytics] Claude API call failed");
            return new AnalyticsResult { Error = "Failed to reach the AI service. Please try again." };
        }

        var text = string.Join("", response.Content
            .Where(b => b.Type == "text")
            .Select(b => b.Text)).Trim();

        if (text.StartsWith("```"))
        {
            var firstNewline = text.IndexOf('\n');
            var lastFence = text.LastIndexOf("```");
            if (firstNewline >= 0 && lastFence > firstNewline)
                text = text[(firstNewline + 1)..lastFence].Trim();
        }

        logger.LogInformation("[Analytics] Claude response: {Text}", text);

        SqlGenResponse parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<SqlGenResponse>(text, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Empty response from Claude");
        }
        catch (JsonException ex)
        {
            logger.LogError(ex, "[Analytics] Failed to parse Claude response: {Text}", text);
            return new AnalyticsResult { Error = "Failed to understand the query. Please rephrase." };
        }

        var sqlUpper = parsed.Sql.TrimStart().ToUpperInvariant();
        if (!sqlUpper.StartsWith("SELECT"))
        {
            logger.LogWarning("[Analytics] Rejected non-SELECT query: {Sql}", parsed.Sql);
            return new AnalyticsResult { Error = "Only read queries are allowed." };
        }

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CanteenDbContext>();
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync(ct);

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = parsed.Sql;

            await using var reader = await cmd.ExecuteReaderAsync(ct);

            var columns = new List<string>();
            for (var i = 0; i < reader.FieldCount; i++)
                columns.Add(reader.GetName(i));

            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync(ct))
            {
                var row = new Dictionary<string, object?>();
                for (var i = 0; i < reader.FieldCount; i++)
                    row[columns[i]] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                rows.Add(row);
            }

            return new AnalyticsResult
            {
                Sql = parsed.Sql,
                ChartType = parsed.ChartType ?? "table",
                Title = parsed.Title ?? "Query Results",
                XLabel = parsed.XLabel,
                YLabel = parsed.YLabel,
                Columns = columns,
                Rows = rows
            };
        }
        catch (SqliteException ex)
        {
            logger.LogError(ex, "[Analytics] SQL execution failed: {Sql}", parsed.Sql);
            return new AnalyticsResult { Error = $"Query failed: {ex.Message}", Sql = parsed.Sql };
        }
        finally
        {
            await conn.CloseAsync();
        }
    }
}

file class SqlGenResponse
{
    public string Sql { get; set; } = "";
    public string? ChartType { get; set; }
    public string? Title { get; set; }
    public string? XLabel { get; set; }
    public string? YLabel { get; set; }
}

public class AnalyticsResult
{
    public string? Error { get; set; }
    public string? Sql { get; set; }
    public string ChartType { get; set; } = "table";
    public string Title { get; set; } = "";
    public string? XLabel { get; set; }
    public string? YLabel { get; set; }
    public List<string> Columns { get; set; } = [];
    public List<Dictionary<string, object?>> Rows { get; set; } = [];
}
