using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Vaxora.Api.Dtos;

namespace Vaxora.Api.Services;

public record AgentGatewayResult(bool Success, string? Json, string? Error)
{
    public static AgentGatewayResult Ok(string json) => new(true, json, null);
    public static AgentGatewayResult Fail(string error) => new(false, null, error);
}

public interface IAgentGatewayService
{
    Task<AgentGatewayResult> ChatAsync(AgentChatRequestDto request, string? bearerToken, CancellationToken ct = default);
    Task<AgentGatewayResult> PatientCarePlanAsync(Guid patientProfileId, string? bearerToken, CancellationToken ct = default);
    Task<AgentHealthDto> HealthAsync(CancellationToken ct = default);
}

/// <summary>
/// Server-side gateway to the internal Agentic AI service. React and Flutter talk to this
/// API only; the agent service is never exposed to clients. The caller's JWT is forwarded
/// so agent tools act strictly within that user's permissions.
/// </summary>
public class AgentGatewayService : IAgentGatewayService
{
    public const string HttpClientName = "AgentService";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private const string AgentKeyHeader = "X-Agent-Key";

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AgentGatewayService> _logger;
    private readonly string? _agentServiceKey;

    public AgentGatewayService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<AgentGatewayService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _agentServiceKey = configuration["AgentService:ApiKey"]
            ?? Environment.GetEnvironmentVariable("AGENT_SERVICE_KEY");
    }

    public async Task<AgentGatewayResult> ChatAsync(
        AgentChatRequestDto request,
        string? bearerToken,
        CancellationToken ct = default)
    {
        // Rebuild the payload from validated fields only, so nothing the client attached
        // to a message object is passed through to the model.
        var payload = new
        {
            messages = request.Messages.Select(m => new { role = m.Role, content = m.Content }).ToList(),
            patientInfo = request.PatientInfo,
            targetAgent = string.IsNullOrWhiteSpace(request.TargetAgent) ? null : request.TargetAgent
        };

        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var message = new HttpRequestMessage(HttpMethod.Post, "/api/agent/chat")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        if (!string.IsNullOrWhiteSpace(_agentServiceKey))
        {
            message.Headers.Add(AgentKeyHeader, _agentServiceKey);
        }

        try
        {
            using var response = await client.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Agent service returned {StatusCode}", (int)response.StatusCode);
                return AgentGatewayResult.Fail("The AI assistant could not complete that request. Please try again.");
            }

            if (!IsValidAgentResponse(body))
            {
                _logger.LogWarning("Agent service returned an unrecognised payload shape.");
                return AgentGatewayResult.Fail("The AI assistant returned an unreadable response.");
            }

            return AgentGatewayResult.Ok(body);
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Agent service call timed out.");
            return AgentGatewayResult.Fail("The AI assistant took too long to respond. Please try again.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Agent service is unreachable.");
            return AgentGatewayResult.Fail("The AI assistant is currently unavailable.");
        }
    }

    public async Task<AgentGatewayResult> PatientCarePlanAsync(
        Guid patientProfileId,
        string? bearerToken,
        CancellationToken ct = default)
    {
        var payload = new { patient_profile_id = patientProfileId.ToString() };

        var client = _httpClientFactory.CreateClient(HttpClientName);
        using var message = new HttpRequestMessage(HttpMethod.Post, "/api/agent/patient-care-plan")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        }

        if (!string.IsNullOrWhiteSpace(_agentServiceKey))
        {
            message.Headers.Add(AgentKeyHeader, _agentServiceKey);
        }

        try
        {
            using var response = await client.SendAsync(message, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Agent service returned {StatusCode} for care plan.", (int)response.StatusCode);
                return AgentGatewayResult.Fail("The care plan workflow could not complete. Please try again.");
            }

            if (!IsValidJsonObject(body))
            {
                _logger.LogWarning("Agent service returned an unrecognised care-plan payload shape.");
                return AgentGatewayResult.Fail("The care plan workflow returned an unreadable response.");
            }

            return AgentGatewayResult.Ok(body);
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("Agent care-plan call timed out.");
            return AgentGatewayResult.Fail("The care plan workflow took too long to respond. Please try again.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Agent service is unreachable.");
            return AgentGatewayResult.Fail("The AI assistant is currently unavailable.");
        }
    }

    public async Task<AgentHealthDto> HealthAsync(CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient(HttpClientName);

        try
        {
            using var response = await client.GetAsync("/api/agent/health", ct);
            if (!response.IsSuccessStatusCode)
                return new AgentHealthDto { Online = false };

            var body = await response.Content.ReadAsStringAsync(ct);
            using var document = JsonDocument.Parse(body);

            var agents = new List<string>();
            if (document.RootElement.TryGetProperty("registered_agents", out var registered) &&
                registered.ValueKind == JsonValueKind.Array)
            {
                agents.AddRange(registered.EnumerateArray()
                    .Where(a => a.ValueKind == JsonValueKind.String)
                    .Select(a => a.GetString()!)
                );
            }

            return new AgentHealthDto { Online = true, Agents = agents };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Agent health check failed.");
            return new AgentHealthDto { Online = false };
        }
    }

    /// <summary>Deterministic output check: the agent must return an object carrying a content string.</summary>
    private static bool IsValidAgentResponse(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return false;

        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.ValueKind == JsonValueKind.Object &&
                   document.RootElement.TryGetProperty("content", out var content) &&
                   content.ValueKind == JsonValueKind.String;
        }
        catch (JsonException)
        {
            return false;
        }
    }

    /// <summary>Looser check for endpoints that return a structured object (not just a chat message).</summary>
    private static bool IsValidJsonObject(string body)
    {
        if (string.IsNullOrWhiteSpace(body)) return false;

        try
        {
            using var document = JsonDocument.Parse(body);
            return document.RootElement.ValueKind == JsonValueKind.Object;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
