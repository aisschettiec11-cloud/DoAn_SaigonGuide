using AudioGuide.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace AudioGuide.Api;
public class DesignFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<AppDbContext>().UseMySql("Server=localhost;Database=saigon_audio_guide;User=guide", new MySqlServerVersion(new Version(8, 0, 0))).Options);
}
