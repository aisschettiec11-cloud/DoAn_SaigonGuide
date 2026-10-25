import { useRef, useState, useEffect } from "react";
import { post, api, sessionId } from "./api";
export function useNarrator(t, onStarted) {
  const [state, set] = useState("idle"),
    [progress, setProgress] = useState(0),
    [duration, setDuration] = useState(0),
    [error, setError] = useState(""),
    [rate, setRate] = useState(1);
  const player = useRef(null),
    utterance = useRef(null),
    generation = useRef(0),
    current = useRef(null),
    logId = useRef(null),
    logPromise = useRef(null),
    begun = useRef(false),
    rateRef = useRef(1),
    stateRef = useRef("idle");
  const change = (s) => {
    stateRef.current = s;
    set(s);
  };
  function stop() {
    generation.current++;
    if (player.current) {
      player.current.pause();
      player.current.src = "";
      player.current = null;
    }
    if (utterance.current) {
      utterance.current = null;
      window.speechSynthesis?.cancel();
    }
    change("idle");
    setProgress(0);
    setDuration(0);
    current.current = null;
  }
  function started(n, trigger, gen) {
    if (gen !== generation.current || begun.current) return;
    begun.current = true;
    onStarted(n.locationId);
    logPromise.current = post("/playlogs", {
      sessionId: sessionId(),
      locationId: n.locationId,
      languageId: n.languageId,
      triggerType: trigger,
    })
      .then((x) => {
        if (gen === generation.current) logId.current = x.id;
        return x.id;
      })
      .catch(() => null);
  }
  async function ended(gen, promise) {
    if (gen !== generation.current) return;
    change("ended");
    setProgress((x) => x || 100);
    const id = await promise;
    if (id)
      api(`/playlogs/${id}/complete`, {
        method: "PUT",
        body: JSON.stringify({ sessionId: sessionId() }),
      }).catch(() => {});
  }
  async function speakFromServer(n, trigger, gen) {
    if (gen !== generation.current) return;
    change("loading");
    try {
      const { url } = await post(
        `/locations/${n.locationId}/speech?lang=${encodeURIComponent(n.languageCode)}`,
        {},
      );
      if (gen === generation.current)
        await playFile(n, trigger, gen, url, false);
    } catch (error) {
      if (gen === generation.current) {
        setError(t(error.status === 400 ? "noVoice" : "audioError"));
        change("idle");
      }
    }
  }
  async function speak(n, trigger, gen, offset = 0) {
    const synth = window.speechSynthesis;
    const voices = synth?.getVoices() || [];
    const locale = n.voice.toLowerCase().replaceAll("_", "-");
    const language = n.languageCode.toLowerCase().split("-")[0];
    const voice =
      voices.find(
        (v) => v.lang.toLowerCase().replaceAll("_", "-") === locale,
      ) ||
      voices.find((v) => v.lang.toLowerCase().split(/[-_]/)[0] === language);
    if (!voice) {
      return speakFromServer(n, trigger, gen);
    }
    const u = new SpeechSynthesisUtterance(n.narrationText.slice(offset));
    utterance.current = u;
    u.lang = n.voice;
    u.voice = voice;
    u.rate = rateRef.current;
    setDuration(n.narrationText.length);
    setProgress(offset);
    u.onstart = () => {
      if (gen !== generation.current) return;
      change("playing");
      started(n, trigger, gen);
    };
    u.onboundary = (e) => {
      if (gen === generation.current) setProgress(offset + e.charIndex);
    };
    u.onend = () => {
      if (gen === generation.current) {
        setProgress(n.narrationText.length);
        ended(gen, logPromise.current);
      }
    };
    u.onerror = (e) => {
      if (
        gen === generation.current &&
        e.error !== "interrupted" &&
        e.error !== "canceled"
      ) {
        utterance.current = null;
        speakFromServer(n, trigger, gen);
      }
    };
    synth.speak(u);
  }
  async function play(n, trigger = "Manual") {
    stop();
    const gen = generation.current;
    current.current = { n, trigger };
    begun.current = false;
    logId.current = null;
    logPromise.current = null;
    setError("");
    change("loading");
    if (n.audioUrl) await playFile(n, trigger, gen, n.audioUrl);
    else await speak(n, trigger, gen);
  }
  async function playFile(n, trigger, gen, url, fallback = true) {
    const fail = () => {
      if (fallback) speak(n, trigger, gen);
      else {
        setError(t("audioError"));
        change("idle");
      }
    };
    const a = new Audio(url);
    player.current = a;
    a.playbackRate = rateRef.current;
    a.onloadedmetadata = () => {
      if (gen === generation.current) setDuration(a.duration);
    };
    a.ontimeupdate = () => {
      if (gen === generation.current) setProgress(a.currentTime);
    };
    a.onplaying = () => {
      if (gen === generation.current) {
        change("playing");
        started(n, trigger, gen);
      }
    };
    a.onended = () => ended(gen, logPromise.current);
    a.onerror = () => {
      if (gen === generation.current) {
        a.pause();
        player.current = null;
        fail();
      }
    };
    try {
      await a.play();
    } catch (e) {
      if (gen === generation.current) {
        if (e.name === "NotAllowedError") {
          setError(t("audioError"));
          change("idle");
        } else if (player.current) {
          player.current = null;
          fail();
        }
      }
    }
  }
  function toggle() {
    if (stateRef.current === "playing") {
      player.current ? player.current.pause() : window.speechSynthesis?.pause();
      change("paused");
    } else if (stateRef.current === "paused") {
      if (player.current)
        player.current.play().catch(() => setError(t("audioError")));
      else window.speechSynthesis?.resume();
      change("playing");
    }
  }
  function seek(value) {
    if (player.current) {
      player.current.currentTime = value;
      setProgress(value);
    } else if (current.current && utterance.current) {
      const { n, trigger } = current.current;
      generation.current++;
      const gen = generation.current;
      window.speechSynthesis.cancel();
      speak(n, trigger, gen, Math.floor(value));
    }
  }
  function speed(value) {
    rateRef.current = value;
    setRate(value);
    if (player.current) player.current.playbackRate = value;
    else if (current.current && stateRef.current === "playing") seek(progress);
  }
  useEffect(() => {
    window.speechSynthesis?.getVoices();
    return () => stop();
  }, []);
  return {
    state,
    progress,
    duration,
    error,
    rate,
    play,
    stop,
    toggle,
    seek,
    speed,
    hasFile: !!player.current,
  };
}
