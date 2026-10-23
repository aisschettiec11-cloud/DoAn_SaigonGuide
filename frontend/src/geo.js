export function distance(a, b) {
  const r = Math.PI / 180;
  const q =
    Math.sin(((b.latitude - a.latitude) * r) / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(((b.longitude - a.longitude) * r) / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(q), Math.sqrt(Math.max(0, 1 - q)));
}
export class GeofenceTracker {
  constructor(played = []) {
    this.inside = new Map();
    this.played = new Map(played);
  }
  markPlayed(id, now = Date.now()) {
    this.played.set(id, now);
  }
  update(position, locations, now = Date.now()) {
    if (position.accuracy > 50) {
      this.inside.clear();
      return [];
    }
    const eligible = [];
    for (const p of locations) {
      const d = distance(position, p),
        previous = this.inside.get(p.id);
      if (d > p.radiusM * 1.3) {
        this.inside.delete(p.id);
        continue;
      }
      if (d > p.radiusM) {
        if (previous) this.inside.set(p.id, { ...previous, count: 0 });
        continue;
      }
      const count = (previous?.count || 0) + 1;
      this.inside.set(p.id, { count });
      if (count >= 2 && now - (this.played.get(p.id) ?? -Infinity) >= 1800000)
        eligible.push({ ...p, distance: d, ratio: d / p.radiusM });
    }
    return eligible.sort(
      (a, b) => a.ratio - b.ratio || b.priority - a.priority,
    );
  }
}
