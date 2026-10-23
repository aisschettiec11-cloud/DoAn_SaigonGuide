import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import {
  Headphones,
  ArrowUpRight,
  MapPin,
  Navigation,
  Search,
  Sun,
  Moon,
  Globe,
  Play,
  Pause,
  Square,
  Check,
  ChevronRight,
  X,
  Clock,
  Compass,
  Volume2,
  Star,
  ArrowLeft,
  Radio,
  List,
  LocateFixed,
} from "lucide-react";
import { api, post } from "./api";
import { distance, GeofenceTracker } from "./geo";
import { useNarrator } from "./useNarrator";
import MapView from "./MapView";
const Admin = lazy(() => import("./Admin"));
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
export default function App() {
  return location.pathname.startsWith("/admin") ? (
    <Suspense fallback={<div className="loading">Đang tải quản trị…</div>}>
      <Admin />
    </Suspense>
  ) : (
    <Tourist />
  );
}
function Tourist() {
  const { t, i18n } = useTranslation();
  const [languages, setLanguages] = useState([]),
    [places, setPlaces] = useState([]),
    [selected, setSelected] = useState(null),
    [narration, setNarration] = useState(null),
    [welcome, setWelcome] = useState(!localStorage.getItem("guide-welcome")),
    [dark, setDark] = useState(read("guide-dark", false)),
    [query, setQuery] = useState(""),
    [near, setNear] = useState(false),
    [position, setPosition] = useState(null),
    [gps, setGps] = useState("gpsOff"),
    [visited, setVisited] = useState(read("guide-visited", [])),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [route, setRoute] = useState(null),
    [suggestion, setSuggestion] = useState(null),
    [mobileTab, setMobileTab] = useState("list"),
    [rating, setRating] = useState(5),
    [comment, setComment] = useState(""),
    [feedback, setFeedback] = useState(""),
    [online, setOnline] = useState(navigator.onLine);
  const tracker = useRef(
      new GeofenceTracker(
        (() => {
          try {
            return JSON.parse(sessionStorage.getItem("guide-played")) || [];
          } catch {
            return [];
          }
        })(),
      ),
    ),
    watch = useRef(null),
    lastSample = useRef(0),
    lastCandidates = useRef([]),
    gpsGeneration = useRef(0),
    loadGeneration = useRef(0),
    selectedRef = useRef(null),
    placesRef = useRef([]),
    autoBusy = useRef(false),
    dismissed = useRef(new Map());
  const audio = useNarrator(t, (id) => {
    tracker.current.markPlayed(id);
    sessionStorage.setItem(
      "guide-played",
      JSON.stringify([...tracker.current.played]),
    );
    setVisited((v) => {
      const n = v.includes(id) ? v : [...v, id];
      localStorage.setItem("guide-visited", JSON.stringify(n));
      return n;
    });
  });
  const audioRef = useRef(audio);
  audioRef.current = audio;
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("guide-dark", JSON.stringify(dark));
  }, [dark]);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener("online", yes);
    window.addEventListener("offline", no);
    api("/languages")
      .then((ls) => {
        setLanguages(ls);
        if (ls.length && !ls.some((l) => l.code === i18n.language))
          i18n.changeLanguage((ls.find((l) => l.isDefault) || ls[0]).code);
      })
      .catch((e) => setError(e.message));
    return () => {
      window.removeEventListener("online", yes);
      window.removeEventListener("offline", no);
      if (watch.current !== null)
        navigator.geolocation.clearWatch(watch.current);
    };
  }, []);
  useEffect(() => {
    let active = true;
    audio.stop();
    setNarration(null);
    setBusy(true);
    setError("");
    localStorage.setItem("guide-language", i18n.language);
    document.documentElement.lang = i18n.language;
    api("/locations?lang=" + encodeURIComponent(i18n.language))
      .then((ps) => {
        if (!active) return;
        setPlaces(ps);
        placesRef.current = ps;
        const p = ps.find((x) => x.id === selectedRef.current?.id);
        if (p) {
          setSelected(p);
          selectedRef.current = p;
          return api(
            `/locations/${p.id}/narration?lang=${encodeURIComponent(i18n.language)}`,
          ).then((n) => {
            if (active) setNarration(n);
          });
        }
        setSelected(null);
        selectedRef.current = null;
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setBusy(false));
    return () => {
      active = false;
      loadGeneration.current++;
    };
  }, [i18n.language]);
  async function selectPlace(p, trigger = null) {
    const gen = ++loadGeneration.current;
    setError("");
    setSelected(p);
    selectedRef.current = p;
    setNarration(null);
    setFeedback("");
    audioRef.current.stop();
    setBusy(true);
    try {
      const n = await api(
        `/locations/${p.id}/narration?lang=${encodeURIComponent(i18n.language)}`,
      );
      if (gen !== loadGeneration.current) return;
      setNarration(n);
      if (trigger) await audioRef.current.play(n, trigger);
    } catch (e) {
      if (gen === loadGeneration.current) setError(e.message);
    } finally {
      if (gen === loadGeneration.current) setBusy(false);
    }
  }
  function disableGps() {
    gpsGeneration.current++;
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
    watch.current = null;
    setGps("gpsOff");
    tracker.current.inside.clear();
    setSuggestion(null);
  }
  function enableGps() {
    if (watch.current !== null) {
      disableGps();
      return;
    }
    if (!navigator.geolocation) {
      setGps("gpsDenied");
      return;
    }
    setGps("gpsSearching");
    const generation = ++gpsGeneration.current;
    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (generation !== gpsGeneration.current) return;
        const pos = {
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        };
        setPosition(pos);
        setGps(pos.accuracy > 50 ? "gpsPoor" : "gpsReady");
        if (Date.now() - lastSample.current < 1500) return;
        lastSample.current = Date.now();
        const candidates = tracker.current.update(pos, placesRef.current);
        lastCandidates.current = candidates;
        if (pos.accuracy > 50) {
          setSuggestion(null);
          return;
        }
        try {
          const server = await api(
            `/locations/nearby?lat=${pos.latitude}&lng=${pos.longitude}&acc=${pos.accuracy}`,
          );
          if (generation !== gpsGeneration.current) return;
          const eligible = candidates.filter(
            (x) =>
              server.some((s) => s.id === x.id) &&
              Date.now() - (dismissed.current.get(x.id) || 0) > 60000,
          );
          const next = eligible[0];
          if (!next || autoBusy.current) return;
          if (
            audioRef.current.state === "playing" ||
            audioRef.current.state === "paused" ||
            audioRef.current.state === "loading"
          ) {
            if (selectedRef.current?.id !== next.id) setSuggestion(next);
            return;
          }
          autoBusy.current = true;
          try {
            await selectPlace(next, "GPS");
          } finally {
            autoBusy.current = false;
          }
        } catch {
          /* manual mode and cached content remain available */
        }
      },
      () => {
        if (generation === gpsGeneration.current) {
          disableGps();
          setGps("gpsDenied");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }
  function begin() {
    localStorage.setItem("guide-welcome", "1");
    setWelcome(false);
    window.speechSynthesis?.getVoices();
  }
  const display = places
    .filter((p) =>
      p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      near && position
        ? distance(position, a) - distance(position, b)
        : a.displayOrder - b.displayOrder,
    );
  const formatDistance = (p) =>
    position ? `${Math.round(distance(position, p))} m` : "GPS";
  async function sendFeedback(e) {
    e.preventDefault();
    if (!narration) return;
    setFeedback("");
    try {
      await post("/feedbacks", {
        locationId: selected.id,
        languageId: narration.languageId,
        rating,
        comment,
      });
      setFeedback(t("thanks"));
      setComment("");
    } catch (e) {
      setFeedback(e.message);
    }
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Saigon Guide">
          <span className="brand-icon">
            <Headphones size={23} />
          </span>
          <span>
            saigon<span className="brand-serif">guide.</span>
            <small>THE CITY, IN YOUR LANGUAGE</small>
          </span>
        </a>
        <nav>
          <span className="nav-active">
            <Compass size={17} />
            {t("explore")}
          </span>
          <a href="/admin">
            CMS <ArrowUpRight size={14} />
          </a>
        </nav>
        <div className="header-actions">
          <label className="language-select">
            <Globe size={16} />
            <select
              aria-label={t("choose")}
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-button theme-toggle"
            aria-label={t(dark ? "light" : "dark")}
            onClick={() => setDark(!dark)}
          >
            {dark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>
      {!online && (
        <div className="offline-banner" role="status">
          {t("offline")}
        </div>
      )}
      <main className="workspace">
        <aside
          className={`discovery-panel ${mobileTab === "map" ? "mobile-hidden" : ""}`}
        >
          <div className="panel-intro">
            <div className="eyebrow">
              <span /> HO CHI MINH CITY · VIETNAM
            </div>
            <h1>
              {t("explore")}
              <br />
              <em>Sài Gòn.</em>
              <span className="little-star">✳</span>
            </h1>
            <p>{t("subtitle")}</p>
            <div className="journey-progress">
              <div>
                <Compass size={16} />
                <span>{t("progress")}</span>
                <strong>
                  {places.filter((p) => visited.includes(p.id)).length}
                  <span> / {places.length}</span>
                </strong>
              </div>
              <progress
                value={places.filter((p) => visited.includes(p.id)).length}
                max={places.length || 1}
              />
            </div>
          </div>
          <div className="list-controls">
            <div className="search">
              <Search size={17} />
              <input
                aria-label={t("search")}
                placeholder={t("search")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear">
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="list-filters">
              <button
                className={!near ? "selected" : ""}
                onClick={() => setNear(false)}
              >
                {t("all")} <span>{places.length}</span>
              </button>
              <button
                className={near ? "selected" : ""}
                disabled={!position}
                onClick={() => setNear(true)}
              >
                <LocateFixed size={13} />
                {t("nearby")}
              </button>
            </div>
            <div className="section-label">
              {t("locations")}
              <span>01 — {String(places.length).padStart(2, "0")}</span>
            </div>
          </div>
          <div className="place-list">
            {busy && !places.length && <p className="muted">{t("loading")}</p>}
            {!display.length && !busy && <p>{t("empty")}</p>}
            {display.map((p, i) => (
              <button
                key={p.id}
                className={`place-card ${selected?.id === p.id ? "chosen" : ""}`}
                onClick={() => {
                  selectPlace(p);
                  setMobileTab("map");
                }}
              >
                <div className="place-thumbnail">
                  <img
                    src={p.imageUrl || "/images/buu-dien-trung-tam.svg"}
                    alt=""
                    loading="lazy"
                  />
                  <span>{String(places.indexOf(p) + 1).padStart(2, "0")}</span>
                </div>
                <div className="place-card-body">
                  <small>
                    {visited.includes(p.id) ? (
                      <>
                        <Check size={12} />
                        {t("visited")}
                      </>
                    ) : (
                      <>
                        <MapPin size={12} />
                        {formatDistance(p)}
                      </>
                    )}
                  </small>
                  <h2>{p.name}</h2>
                  <span className="place-category">{p.address}</span>
                </div>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
          <div className="sidebar-foot">
            <Headphones size={18} />
            <span>{t("manual")}</span>
            <span className="status-dot" />
          </div>
        </aside>
        <section
          className={`map-panel ${mobileTab === "list" ? "mobile-hidden" : ""}`}
        >
          <MapView
            places={places}
            selected={selected}
            onSelect={selectPlace}
            position={position}
            route={route}
            dark={dark}
          />
          <div className="map-top">
            <div className="map-label">
              <span className="live-dot" /> SAIGON EXPLORER{" "}
              <span>10.7769° N · 106.7009° E</span>
            </div>
            <button
              className={`gps-button ${gps === "gpsReady" ? "enabled" : ""}`}
              onClick={enableGps}
            >
              <Navigation size={17} />
              {gps === "gpsReady"
                ? `${Math.round(position?.accuracy)} m`
                : t("gps")}
            </button>
          </div>
          <div
            className={`gps-status ${gps === "gpsPoor" || gps === "gpsDenied" ? "warning" : ""}`}
            role="status"
          >
            <Radio size={14} />
            {t(gps)}
          </div>
          {!selected && (
            <div className="map-invite">
              <div className="eyebrow">SAIGON, SLOWLY.</div>
              <h2>{t("welcome")}</h2>
              <p>{t("intro")}</p>
              <span>
                <MapPin size={15} /> {places.length}{" "}
                {t("locations").toLowerCase()}
              </span>
            </div>
          )}
          {route && (
            <div className="route-note">
              <Navigation size={14} />
              {Math.round(position ? distance(position, route) : 0)} m ·{" "}
              {t("directions")} <small>(straight line)</small>
              <button
                className="icon-button"
                aria-label={t("stop")}
                onClick={() => setRoute(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {selected && (
            <article className="detail-card">
              <button
                className="close-detail icon-button"
                aria-label={t("back")}
                onClick={() => {
                  audio.stop();
                  setSelected(null);
                  selectedRef.current = null;
                  loadGeneration.current++;
                  setNarration(null);
                  setRoute(null);
                }}
              >
                <X size={19} />
              </button>
              <div className="detail-image">
                <img src={selected.imageUrl} alt="" />
                <span className="detail-badge">
                  <Headphones size={13} /> AUDIO STORY
                </span>
              </div>
              <div className="detail-content">
                <div className="detail-meta">
                  <span>
                    {String(
                      places.findIndex((x) => x.id === selected.id) + 1,
                    ).padStart(2, "0")}{" "}
                    / SAIGON COLLECTION
                  </span>
                  {visited.includes(selected.id) && (
                    <span className="visited-badge">
                      <Check size={12} />
                      {t("visited")}
                    </span>
                  )}
                </div>
                <h2>{narration?.name || selected.name}</h2>
                <p className="short-description">
                  {narration?.shortDescription || selected.shortDescription}
                </p>
                {narration?.fallback && (
                  <p className="notice">{t("fallback")}</p>
                )}
                {busy ? (
                  <p>{t("loading")}</p>
                ) : (
                  narration && (
                    <>
                      <div className="player">
                        <button
                          className="play-button"
                          aria-label={
                            audio.state === "playing"
                              ? t("pause")
                              : audio.state === "paused"
                                ? t("resume")
                                : t("listen")
                          }
                          onClick={() =>
                            audio.state === "playing" ||
                            audio.state === "paused"
                              ? audio.toggle()
                              : audio.play(narration)
                          }
                          disabled={audio.state === "loading"}
                        >
                          {audio.state === "playing" ? (
                            <Pause size={21} />
                          ) : (
                            <Play size={21} />
                          )}
                        </button>
                        <div className="player-body">
                          <span>
                            {audio.state === "playing"
                              ? t("listen")
                              : visited.includes(selected.id)
                                ? t("replay")
                                : t("listen")}
                          </span>
                          <input
                            aria-label={t("seek")}
                            type="range"
                            min="0"
                            max={audio.duration || 1}
                            value={audio.progress}
                            disabled={!audio.duration}
                            onChange={(e) => audio.seek(+e.target.value)}
                          />
                          <small>
                            {narration.voice} ·{" "}
                            {narration.audioUrl ? "AUDIO" : "TEXT TO SPEECH"}
                          </small>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={t("stop")}
                          onClick={audio.stop}
                        >
                          <Square size={15} />
                        </button>
                        <select
                          className="speed"
                          aria-label={t("speed")}
                          value={audio.rate}
                          onChange={(e) => audio.speed(+e.target.value)}
                        >
                          {[0.75, 1, 1.25, 1.5, 2].map((v) => (
                            <option key={v} value={v}>
                              {v}×
                            </option>
                          ))}
                        </select>
                      </div>
                      {audio.error && (
                        <p className="notice" role="alert">
                          {audio.error}
                        </p>
                      )}
                      <button
                        className="directions-button"
                        onClick={() =>
                          position ? setRoute(selected) : enableGps()
                        }
                      >
                        <Navigation size={16} />
                        {t("directions")}
                        <ArrowUpRight size={16} />
                      </button>
                      <details>
                        <summary>{t("history")}</summary>
                        <p className="narration-text">
                          {narration.historyText || narration.narrationText}
                        </p>
                        <p>
                          <MapPin size={13} /> {selected.address}
                        </p>
                        <p>
                          <Clock size={13} /> {selected.openingHours}
                        </p>
                      </details>
                      <details>
                        <summary>{t("feedback")}</summary>
                        <form className="feedback-form" onSubmit={sendFeedback}>
                          <label>
                            {t("rating")}
                            <select
                              value={rating}
                              onChange={(e) => setRating(+e.target.value)}
                            >
                              {[5, 4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n} ★
                                </option>
                              ))}
                            </select>
                          </label>
                          <textarea
                            aria-label={t("comment")}
                            placeholder={t("comment")}
                            maxLength={2000}
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                          />
                          <button className="primary" type="submit">
                            {t("send")}
                            <Star size={14} />
                          </button>
                          <p role="status">{feedback}</p>
                        </form>
                      </details>
                    </>
                  )
                )}
              </div>
            </article>
          )}
        </section>
      </main>
      <div className="mobile-tabs">
        <button
          className={mobileTab === "list" ? "active" : ""}
          onClick={() => setMobileTab("list")}
        >
          <List size={18} />
          {t("locations")}
        </button>
        <button
          className={mobileTab === "map" ? "active" : ""}
          onClick={() => setMobileTab("map")}
        >
          <MapPin size={18} />
          {t("map")}
        </button>
      </div>
      {error && (
        <div className="toast" role="alert">
          {error}
          <button aria-label={t("dismiss")} onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {suggestion && (
        <div className="modal-backdrop">
          <div className="switch-dialog" role="dialog" aria-modal="true">
            <Navigation size={28} />
            <h2>
              {t("switch")} {suggestion.name}?
            </h2>
            <button
              className="primary"
              onClick={() => {
                selectPlace(suggestion, "GPS");
                setSuggestion(null);
              }}
            >
              {t("listen")}
            </button>
            <button
              className="secondary"
              onClick={() => {
                dismissed.current.set(suggestion.id, Date.now());
                setSuggestion(null);
              }}
            >
              {t("dismiss")}
            </button>
          </div>
        </div>
      )}
      {welcome && (
        <div className="modal-backdrop welcome-backdrop">
          <section
            className="welcome-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <div className="welcome-art">
              <img src="/images/saigon-skyline.svg" alt="" />
              <span className="eyebrow">A LITTLE CLOSER TO THE CITY</span>
              <h2>
                Sài Gòn,
                <br />
                <em>xin chào.</em>
              </h2>
              <span className="art-stamp">
                10°46′ N<br />
                106°42′ E
              </span>
            </div>
            <div className="welcome-content">
              <div className="eyebrow">
                <Headphones size={14} /> YOUR PERSONAL AUDIO GUIDE
              </div>
              <h2 id="welcome-title">{t("welcome")}</h2>
              <p>{t("intro")}</p>
              <label className="welcome-language-label">{t("choose")}</label>
              <div className="language-grid">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    className={i18n.language === l.code ? "selected" : ""}
                    onClick={() => i18n.changeLanguage(l.code)}
                  >
                    <span>{l.code.toUpperCase()}</span>
                    {l.nativeName}
                    {i18n.language === l.code && <Check size={15} />}
                  </button>
                ))}
              </div>
              <button
                className="primary begin-button"
                onClick={begin}
                disabled={!languages.length}
              >
                {t("begin")}
                <ArrowUpRight size={19} />
              </button>
              <small className="sound-note">
                <Volume2 size={13} />
                {t("sound")}
              </small>
              {error && <p role="alert">{error}</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
