namespace CanteenApi.Models;

public record LoginRequest(string Email, string Password);
public record RegisterRequest(string Email, string Password, string Name);
public record AuthResponse(string Token, string Email, string Name, string Role);
