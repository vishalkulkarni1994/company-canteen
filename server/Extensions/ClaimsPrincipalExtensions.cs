using System.Security.Claims;

namespace CanteenApi.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user)
        => int.Parse(user.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    public static int? GetCompanyId(this ClaimsPrincipal user)
    {
        var claim = user.FindFirst("CompanyId");
        return claim is not null ? int.Parse(claim.Value) : null;
    }

    public static string GetRole(this ClaimsPrincipal user)
        => user.FindFirst(ClaimTypes.Role)?.Value ?? "User";

    public static bool IsSuperAdmin(this ClaimsPrincipal user)
        => user.GetRole() == "SuperAdmin";

    public static bool IsCompanyAdmin(this ClaimsPrincipal user)
        => user.GetRole() is "CompanyAdmin" or "SuperAdmin";
}
