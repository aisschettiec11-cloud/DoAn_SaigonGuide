import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const config = Object.fromEntries(
  readFileSync(new URL("../../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((x) => x && !x.startsWith("#"))
    .map((x) => {
      const i = x.indexOf("=");
      return [x.slice(0, i), x.slice(i + 1)];
    }),
);
async function speechMock(page) {
  await page.addInitScript(() => {
    localStorage.setItem("guide-language", "vi");
    window.__spoken = [];
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () =>
          ["vi-VN", "en-US", "ko-KR", "ja-JP", "zh-CN", "th-TH"].map(
            (lang) => ({ lang, name: lang }),
          ),
        speak: (u) => {
          window.__spoken.push(u.lang);
          setTimeout(() => u.onstart?.(), 5);
        },
        cancel: () => {},
        pause: () => {},
        resume: () => {},
      },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
  });
}
async function begin(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Khám phá ngay", exact: true })
    .click();
  await expect(page.locator(".place-card")).toHaveCount(6);
}
test("language selection, map, manual playback, pause and feedback", async ({
  page,
}) => {
  await speechMock(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await begin(page);
  await expect(page.locator(".leaflet-marker-icon")).toHaveCount(6);
  await page.locator(".place-card").first().click();
  await expect(page.locator(".detail-content h2")).toContainText("Bưu điện");
  await page
    .getByRole("button", { name: "Nghe câu chuyện", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tạm dừng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Tiếp tục", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục", exact: true }).click();
  await page.getByLabel("Ngôn ngữ thuyết minh").selectOption("ko");
  await expect(page.locator(".detail-content h2")).toContainText("사이공");
  await page.getByRole("button", { name: "이야기 듣기", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__spoken.at(-1)))
    .toBe("ko-KR");
  await page.locator("summary").last().click();
  await page.getByLabel("의견").fill("테스트 방문: 좋은 안내입니다.");
  await page.getByRole("button", { name: "평가 보내기" }).click();
  await expect(page.locator(".feedback-form")).toContainText("감사합니다!");
  expect(errors).toEqual([]);
});
test("GPS denial keeps manual mode usable", async ({ page }) => {
  await speechMock(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (_ok, fail) => {
          setTimeout(() => fail({ code: 1 }), 10);
          return 1;
        },
        clearWatch: () => {},
      },
    }),
  );
  await begin(page);
  await page.getByRole("button", { name: "Bật định vị", exact: true }).click();
  await expect(page.locator(".gps-status")).toContainText(
    "Không truy cập được GPS",
  );
  await page.locator(".place-card").nth(1).click();
  await expect(page.locator(".detail-content h2")).toHaveText("Dinh Độc Lập");
});
test("GPS filters inaccuracy, debounces, resolves overlap, cooldown and asks before switching", async ({
  page,
}) => {
  await speechMock(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "geolocation", {
      value: {
        watchPosition: (ok) => {
          window.__gps = ok;
          return 1;
        },
        clearWatch: () => {},
      },
    }),
  );
  await begin(page);
  await page.getByRole("button", { name: "Bật định vị", exact: true }).click();
  const emit = async (lat, lng, accuracy = 5) => {
    await page.evaluate(
      ({ lat, lng, accuracy }) =>
        window.__gps({ coords: { latitude: lat, longitude: lng, accuracy } }),
      { lat, lng, accuracy },
    );
    await page.waitForTimeout(1600);
  };
  await emit(10.7799, 106.6999, 70);
  await expect(page.locator(".gps-status")).toContainText("50m");
  await emit(10.7799, 106.6999);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(0);
  await emit(10.7799, 106.6999);
  await expect(page.locator(".detail-content h2")).toContainText("Bưu điện");
  await expect.poll(() => page.evaluate(() => window.__spoken.length)).toBe(1);
  await emit(10.7799, 106.6999);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(1);
  await emit(10.777, 106.6955);
  await emit(10.777, 106.6955);
  await expect(page.getByRole("dialog")).toContainText("Dinh Độc Lập");
  await page.getByRole("button", { name: "Để sau" }).click();
  expect(await page.evaluate(() => window.__spoken.length)).toBe(1);
});
test("mobile layout, search and dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await speechMock(page);
  await begin(page);
  await page.getByLabel("Tìm địa điểm…").fill("Dinh");
  await expect(page.locator(".place-card")).toHaveCount(1);
  await page.locator(".place-card").click();
  await expect(page.locator(".detail-card")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Giao diện tối" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "/tmp/saigon-mobile.png", fullPage: true });
});
test("CMS login, edit narration and preview draft workflow", async ({
  page,
}) => {
  await page.goto("/admin");
  await page.getByLabel("Tên đăng nhập").fill(config.ADMIN_USERNAME);
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(config.ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tổng quan", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thuyết minh", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(36);
  await page
    .locator("tbody tr")
    .first()
    .getByRole("button", { name: "Biên tập" })
    .click();
  await expect(page.getByLabel("Nội dung thuyết minh")).not.toBeEmpty();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.getByRole("button", { name: "Ngôn ngữ", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.screenshot({ path: "/tmp/saigon-admin.png", fullPage: true });
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(
    page.getByRole("button", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
test("desktop visual and unavailable fallback audio shows an actionable message", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/locations/*/speech?lang=vi", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Speech unavailable" }) }),
  );
  await speechMock(page);
  await begin(page);
  await page.locator(".place-card").first().click();
  await page.evaluate(() =>
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [], cancel: () => {} },
      configurable: true,
    }),
  );
  await page
    .getByRole("button", { name: "Nghe câu chuyện", exact: true })
    .click();
  await expect(page.locator(".detail-card [role=alert]")).toContainText(
    "Không phát được âm thanh",
  );
  await page.screenshot({ path: "/tmp/saigon-desktop.png", fullPage: true });
});

// Cloud-only test transport: curl uses the host's existing CA/proxy configuration.
// No TLS checks are disabled and browser trust stores remain untouched.
test.beforeEach(async ({ page }) => {
  if (process.env.CLOUD_TLS_BRIDGE !== "1") return;
  await page.route(
    /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/,
    async (route) => {
      try {
        const { stdout } = await promisify(execFile)(
          "curl",
          [
            "--fail",
            "--silent",
            "--show-error",
            "--max-time",
            "20",
            "--user-agent",
            "SaigonGuide/1.0 (+https://github.com/aisschettiec11-cloud/DoAn_SaigonGuide)",
            "--referer",
            "http://localhost:8080/",
            route.request().url(),
          ],
          { encoding: "buffer", maxBuffer: 2 * 1024 * 1024 },
        );
        await route.fulfill({
          status: 200,
          contentType: "image/png",
          body: stdout,
        });
      } catch {
        await route.abort();
      }
    },
  );
});
