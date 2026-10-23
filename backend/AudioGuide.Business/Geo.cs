using AudioGuide.Data;
namespace AudioGuide.Business;
public record NearbyLocation(int Id, double Distance, double Ratio, int Priority);
public interface IGeofenceService { IReadOnlyList<NearbyLocation> Nearby(IEnumerable<Location> locations, double lat, double lng, double accuracy); }
public class GeofenceService : IGeofenceService
{
    public static double Distance(double lat1, double lng1, double lat2, double lng2) { var r = Math.PI / 180; var a = Math.Pow(Math.Sin((lat2 - lat1) * r / 2), 2) + Math.Cos(lat1 * r) * Math.Cos(lat2 * r) * Math.Pow(Math.Sin((lng2 - lng1) * r / 2), 2); return 6371000 * 2 * Math.Atan2(Math.Sqrt(Math.Clamp(a, 0, 1)), Math.Sqrt(Math.Clamp(1 - a, 0, 1))); }
    public IReadOnlyList<NearbyLocation> Nearby(IEnumerable<Location> locations, double lat, double lng, double accuracy) { if (!double.IsFinite(lat) || !double.IsFinite(lng) || !double.IsFinite(accuracy) || Math.Abs(lat) > 90 || Math.Abs(lng) > 180 || accuracy < 0) throw new AppError(400, "Toạ độ không hợp lệ"); if (accuracy > 50) return []; return locations.Where(x => x.IsActive && x.RadiusM > 0).Select(x => new NearbyLocation(x.Id, Distance(lat, lng, x.Latitude, x.Longitude), Distance(lat, lng, x.Latitude, x.Longitude) / x.RadiusM, x.Priority)).Where(x => x.Ratio <= 1).OrderBy(x => x.Ratio).ThenByDescending(x => x.Priority).ToList(); }
}
public class AppError(int status, string message) : Exception(message) { public int Status => status; }
