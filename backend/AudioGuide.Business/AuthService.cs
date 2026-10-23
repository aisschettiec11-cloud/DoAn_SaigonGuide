using AudioGuide.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
namespace AudioGuide.Business;
public record LoginRequest(string Username, string Password);
public interface IAuthService { Task<object> Login(LoginRequest request); }
public class AuthService(IRepository repo, IConfiguration config) : IAuthService
{
    private static readonly string Dummy = BCrypt.Net.BCrypt.HashPassword("timing-comparison-only");
    public async Task<object> Login(LoginRequest r) { if (string.IsNullOrEmpty(r.Username) || string.IsNullOrEmpty(r.Password) || r.Password.Length > 200) throw new AppError(400, "Thiếu tên đăng nhập hoặc mật khẩu"); var u = await repo.Db.AdminUsers.AsNoTracking().SingleOrDefaultAsync(x => x.Username == r.Username && x.IsActive); var valid = BCrypt.Net.BCrypt.Verify(r.Password, u?.PasswordHash ?? Dummy); if (u == null || !valid) throw new AppError(401, "Tên đăng nhập hoặc mật khẩu không đúng"); var exp = DateTime.UtcNow.AddHours(4); var jwt = new JwtSecurityToken(issuer: "saigon-guide", audience: "saigon-guide", claims: [new(ClaimTypes.Name, u.Username), new(ClaimTypes.Role, u.Role)], expires: exp, signingCredentials: new(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["JWT_SECRET"]!)), SecurityAlgorithms.HmacSha256)); return new { token = new JwtSecurityTokenHandler().WriteToken(jwt), expiresAt = exp, u.Username, u.Role, u.FullName }; }
}
