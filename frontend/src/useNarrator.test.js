import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useNarrator } from "./useNarrator";
import { post } from "./api";

vi.mock("./api", () => ({
  post: vi.fn(),
  api: vi.fn(),
  sessionId: () => "session",
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const narration = (lang) => ({
  locationId: 1,
  languageId: 1,
  languageCode: lang,
  voice: `${lang}-XX`,
  narrationText: "Story",
});
function setup(voices = []) {
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
  });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      constructor(text) {
        this.text = text;
      }
    },
  );
  const play = vi.fn().mockResolvedValue();
  vi.stubGlobal(
    "Audio",
    vi.fn(function () {
      this.play = play;
      this.pause = vi.fn();
    }),
  );
  return { ...renderHook(() => useNarrator((key) => key, vi.fn())), play };
}

it.each(["vi", "en", "ko", "ja", "zh", "th", "fr"])(
  "uses server audio when the device has no %s voice",
  async (lang) => {
    post.mockResolvedValue({ url: "/media/voice.mp3" });
    const { result, play } = setup();
    await act(() => result.current.play(narration(lang)));
    expect(post).toHaveBeenCalledWith(`/locations/1/speech?lang=${lang}`, {});
    expect(Audio).toHaveBeenCalledWith("/media/voice.mp3");
    expect(play).toHaveBeenCalledOnce();
    expect(result.current.error).toBe("");
  },
);

it("does not start stale audio after stopping during synthesis", async () => {
  let resolve;
  post.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result, play } = setup();
  let pending;
  act(() => {
    pending = result.current.play(narration("th"));
  });
  act(() => result.current.stop());
  await act(async () => {
    resolve({ url: "/media/stale.mp3" });
    await pending;
  });
  expect(play).not.toHaveBeenCalled();
  expect(result.current.state).toBe("idle");
});

it("reports synthesis failure", async () => {
  post.mockRejectedValue(new Error("unavailable"));
  const { result } = setup();
  await act(() => result.current.play(narration("vi")));
  expect(result.current.error).toBe("audioError");
  expect(result.current.state).toBe("idle");
});

it("uses the same server fallback when an installed voice fails", async () => {
  post.mockResolvedValue({ url: "/media/fallback.mp3" });
  const { result, play } = setup([{ lang: "en-US" }]);
  await act(() => result.current.play(narration("en")));
  expect(post).not.toHaveBeenCalled();
  const utterance = speechSynthesis.speak.mock.calls[0][0];
  await act(async () => {
    await utterance.onerror({ error: "synthesis-failed" });
  });
  expect(post).toHaveBeenCalledWith("/locations/1/speech?lang=en", {});
  expect(play).toHaveBeenCalledOnce();
});

it("prioritizes an uploaded audio file over synthesis", async () => {
  const { result, play } = setup();
  await act(() =>
    result.current.play({ ...narration("ja"), audioUrl: "/media/upload.mp3" }),
  );
  expect(Audio).toHaveBeenCalledWith("/media/upload.mp3");
  expect(play).toHaveBeenCalledOnce();
  expect(post).not.toHaveBeenCalled();
});

it("reports a language unsupported by the server", async () => {
  post.mockRejectedValue(
    Object.assign(new Error("unsupported"), { status: 400 }),
  );
  const { result } = setup();
  await act(() => result.current.play(narration("xx")));
  expect(result.current.error).toBe("noVoice");
  expect(result.current.state).toBe("idle");
});
