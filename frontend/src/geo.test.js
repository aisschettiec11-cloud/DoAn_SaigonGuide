import { describe, it, expect } from "vitest";
import { distance, GeofenceTracker } from "./geo";
const position = { latitude: 0, longitude: 0, accuracy: 5 };
const point = { id: 1, latitude: 0, longitude: 0, radiusM: 100, priority: 0 };
describe("GPS rules", () => {
  it("calculates distances in meters", () => {
    expect(distance(position, { latitude: 0, longitude: 1 })).toBeCloseTo(
      111194.9266,
      2,
    );
    expect(distance(position, position)).toBe(0);
  });
  it("requires two consecutive samples", () => {
    const t = new GeofenceTracker();
    expect(t.update(position, [point])).toEqual([]);
    expect(t.update(position, [point])[0].id).toBe(1);
  });
  it("filters poor accuracy and resets debounce", () => {
    const t = new GeofenceTracker();
    t.update(position, [point]);
    expect(t.update({ ...position, accuracy: 51 }, [point])).toEqual([]);
    expect(t.update(position, [point])).toEqual([]);
  });
  it("suppresses auto replay for 30 minutes", () => {
    const t = new GeofenceTracker();
    t.update(position, [point], 1000);
    t.markPlayed(1, 1000);
    expect(t.update(position, [point], 1800999)).toEqual([]);
    expect(t.update(position, [point], 1801000)[0].id).toBe(1);
  });
  it("retains hysteresis and debounces reentry", () => {
    const t = new GeofenceTracker();
    t.update(position, [point]);
    t.update(position, [point]);
    t.update({ ...position, longitude: 0.001 }, [point]);
    expect(t.inside.has(1)).toBe(true);
    expect(t.update(position, [point])).toEqual([]);
    expect(t.update(position, [point])).toHaveLength(1);
    t.update({ ...position, longitude: 0.002 }, [point]);
    expect(t.inside.has(1)).toBe(false);
  });
  it("chooses normalized distance then priority", () => {
    const ps = [
      { ...point, id: 1, longitude: 0.0003, radiusM: 50 },
      { ...point, id: 2, longitude: 0.0004, radiusM: 100 },
      { ...point, id: 3, longitude: 0.0004, radiusM: 100, priority: 5 },
    ];
    const t = new GeofenceTracker();
    t.update(position, ps);
    expect(t.update(position, ps).map((x) => x.id)).toEqual([3, 2, 1]);
  });
});
