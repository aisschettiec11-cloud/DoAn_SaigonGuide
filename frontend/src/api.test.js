import { it, expect, vi, afterEach } from "vitest";
import { api, post, sessionId } from "./api";
afterEach(() => {
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
it("propagates backend validation and status", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Chỉ Admin được xuất bản" }),
    }),
  );
  await expect(api("/admin/translations")).rejects.toMatchObject({
    message: "Chỉ Admin được xuất bản",
    status: 403,
  });
});
it("sends JWT and handles 204", async () => {
  const f = vi.fn().mockResolvedValue({ ok: true, status: 204 });
  vi.stubGlobal("fetch", f);
  expect(await post("/admin/locations", { slug: "test" }, "token")).toBeNull();
  expect(f).toHaveBeenCalledWith(
    "/api/admin/locations",
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer token" }),
      body: '{"slug":"test"}',
    }),
  );
});
it("uses multipart boundary from browser", async () => {
  const f = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ url: "/media/x.mp3" }),
  });
  vi.stubGlobal("fetch", f);
  const form = new FormData();
  await api("/admin/audio/upload", { method: "POST", body: form, token: "t" });
  expect(f.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
});
it("persists an anonymous session in tab session", () => {
  const a = sessionId();
  expect(sessionId()).toBe(a);
  expect(a).toMatch(/^[a-f0-9-]{36}$/);
});
