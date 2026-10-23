import { useEffect, useState } from "react";
import {
  Headphones,
  MapPin,
  Globe,
  FileText,
  BarChart3,
  LogOut,
  Plus,
  Trash2,
  Save,
  ArrowUpRight,
  Activity,
  Users,
  Upload,
  Volume2,
  Languages,
  CheckCircle2,
  X,
} from "lucide-react";
import { api, post } from "./api";
const blankLocation = {
  slug: "",
  latitude: 10.779,
  longitude: 106.7,
  radiusM: 60,
  priority: 0,
  imageUrl: "",
  openingHours: "",
  address: "",
  displayOrder: 1,
  isActive: true,
};
const blankLanguage = {
  code: "",
  name: "",
  nativeName: "",
  ttsVoiceCode: "",
  isDefault: false,
  isActive: true,
};
const blankTranslation = {
  locationId: 1,
  languageId: 1,
  name: "",
  shortDescription: "",
  narrationText: "",
  historyText: "",
  status: "Draft",
  isMachineTranslated: false,
};
function initialUser() {
  try {
    return JSON.parse(sessionStorage.getItem("guide-admin"));
  } catch {
    return null;
  }
}
export default function Admin() {
  const [user, setUser] = useState(initialUser),
    [tab, setTab] = useState("dashboard"),
    [locations, setLocations] = useState([]),
    [languages, setLanguages] = useState([]),
    [translations, setTranslations] = useState([]),
    [stats, setStats] = useState(null),
    [logs, setLogs] = useState([]),
    [form, setForm] = useState(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [filter, setFilter] = useState(""),
    [login, setLogin] = useState({ username: "admin", password: "" }),
    [loginBusy, setLoginBusy] = useState(false);
  const token = user?.token;
  function logout() {
    sessionStorage.removeItem("guide-admin");
    setUser(null);
    setForm(null);
  }
  async function refresh() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const [ps, ls, ts, st, lg] = await Promise.all([
        api("/admin/locations", { token }),
        api("/admin/languages", { token }),
        api("/admin/translations", { token }),
        api("/admin/statistics", { token }),
        api("/admin/logs", { token }),
      ]);
      setLocations(ps);
      setLanguages(ls);
      setTranslations(ts);
      setStats(st);
      setLogs(lg);
    } catch (e) {
      if (e.status === 401) logout();
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, [token]);
  useEffect(() => {
    if (!user) return;
    const timeout = setTimeout(
      logout,
      Math.max(0, new Date(user.expiresAt) - Date.now() - 1000),
    );
    return () => clearTimeout(timeout);
  }, [user]);
  async function signIn(e) {
    e.preventDefault();
    setLoginBusy(true);
    setError("");
    try {
      const u = await post("/auth/login", login);
      sessionStorage.setItem("guide-admin", JSON.stringify(u));
      setUser(u);
      setLogin({ username: "admin", password: "" });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoginBusy(false);
    }
  }
  async function action(fn, message = "Đã lưu thay đổi") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await refresh();
      return true;
    } catch (e) {
      if (e.status === 401) logout();
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const payload = { ...form };
    delete payload.id;
    delete payload.audioUrl;
    delete payload.location;
    delete payload.language;
    delete payload.createdAt;
    delete payload.updatedAt;
    let endpoint = tab;
    if (tab === "users") {
      if (
        await action(
          () => post("/admin/users", payload, token),
          "Đã tạo tài khoản",
        )
      )
        setForm(null);
      return;
    }
    if (
      await action(() =>
        api("/admin/" + endpoint + (form.id ? "/" + form.id : ""), {
          method: form.id ? "PUT" : "POST",
          body: JSON.stringify(payload),
          token,
        }),
      )
    )
      setForm(null);
  }
  function changeTab(name) {
    setTab(name);
    setForm(null);
    setError("");
    setNotice("");
    setFilter("");
  }
  function field(name, label, type = "text", props = {}) {
    return (
      <label className={type === "textarea" ? "full-field" : ""}>
        {label}
        {type === "textarea" ? (
          <textarea
            value={form[name] ?? ""}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            {...props}
          />
        ) : (
          <input
            type={type}
            value={form[name] ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                [name]: type === "number" ? +e.target.value : e.target.value,
              })
            }
            {...props}
          />
        )}
      </label>
    );
  }
  function checkbox(name, label) {
    return (
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={!!form[name]}
          onChange={(e) => setForm({ ...form, [name]: e.target.checked })}
        />
        {label}
      </label>
    );
  }
  const locationName = (id) =>
    translations.find(
      (x) =>
        x.locationId === id &&
        x.languageId === languages.find((l) => l.code === "vi")?.id,
    )?.name ||
    locations.find((x) => x.id === id)?.slug ||
    `#${id}`;
  const tabs = [
    ["dashboard", "Tổng quan", BarChart3],
    ["locations", "Địa điểm", MapPin],
    ["translations", "Thuyết minh", FileText],
    ["languages", "Ngôn ngữ", Globe],
    ["logs", "Nhật ký", Activity],
    ...(user?.role === "Admin" ? [["users", "Tài khoản", Users]] : []),
  ];
  if (!user)
    return (
      <div className="admin-login">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Headphones />
          </span>
          saigon<span className="brand-serif">guide.</span>
        </a>
        <form onSubmit={signIn} className="login-card">
          <span className="eyebrow">CONTENT MANAGEMENT</span>
          <h1>Chào mừng trở lại.</h1>
          <p>Đăng nhập để chăm sóc những câu chuyện của thành phố.</p>
          <label>
            Tên đăng nhập
            <input
              autoComplete="username"
              required
              value={login.username}
              onChange={(e) => setLogin({ ...login, username: e.target.value })}
            />
          </label>
          <label>
            Mật khẩu
            <input
              autoComplete="current-password"
              type="password"
              required
              value={login.password}
              onChange={(e) => setLogin({ ...login, password: e.target.value })}
            />
          </label>
          {error && (
            <p role="alert" className="error-box">
              {error}
            </p>
          )}
          <button disabled={loginBusy} className="primary">
            {loginBusy ? "Đang đăng nhập…" : "Đăng nhập"}
            <ArrowUpRight size={18} />
          </button>
          <a href="/">← Trở về khám phá</a>
          <small>
            Mật khẩu khởi tạo nằm trong ADMIN_PASSWORD của tệp .env trên máy
            chạy ứng dụng.
          </small>
        </form>
      </div>
    );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="brand" href="/">
          <span className="brand-icon">
            <Headphones />
          </span>
          <span>
            saigon<span className="brand-serif">guide.</span>
            <small>CONTENT STUDIO</small>
          </span>
        </a>
        <span className="sidebar-caption">KHÔNG GIAN QUẢN TRỊ</span>
        <nav>
          {tabs.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => changeTab(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-account">
          <span className="avatar">{user.fullName?.[0] || "A"}</span>
          <div>
            <strong>{user.username}</strong>
            <small>{user.role}</small>
          </div>
          <button
            className="icon-button"
            aria-label="Đăng xuất"
            onClick={logout}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-heading">
          <div className="eyebrow">SAIGON GUIDE / CONTENT STUDIO</div>
          <a href="/">
            Xem ứng dụng <ArrowUpRight size={15} />
          </a>
        </header>
        <div className="admin-title">
          <div>
            <h1>{tabs.find((x) => x[0] === tab)?.[1]}</h1>
            <p>Quản lý nội dung, kết nối những hành trình.</p>
          </div>
          <div className="admin-toolbar">
            <button className="secondary" disabled={busy} onClick={refresh}>
              Làm mới
            </button>
            {!["dashboard", "logs"].includes(tab) && (
              <button
                className="primary"
                onClick={() =>
                  setForm(
                    tab === "locations"
                      ? { ...blankLocation }
                      : tab === "languages"
                        ? { ...blankLanguage }
                        : tab === "translations"
                          ? {
                              ...blankTranslation,
                              locationId: locations[0]?.id || 0,
                              languageId: languages[0]?.id || 0,
                            }
                          : {
                              username: "",
                              password: "",
                              fullName: "",
                              role: "Editor",
                            },
                  )
                }
              >
                <Plus size={17} />
                Thêm mới
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="success-box" role="status">
            <CheckCircle2 size={17} />
            {notice}
          </div>
        )}
        {busy && (
          <p role="status" className="muted">
            Đang xử lý…
          </p>
        )}
        {tab === "dashboard" && stats && (
          <>
            <div className="metric-grid">
              {[
                [stats.total, "Lượt nghe", Headphones],
                [stats.completed, "Nghe hoàn tất", CheckCircle2],
                [locations.length, "Điểm tham quan", MapPin],
                [
                  languages.filter((x) => x.isActive).length,
                  "Ngôn ngữ hoạt động",
                  Globe,
                ],
              ].map(([v, n, Icon]) => (
                <div key={n} className="metric-card">
                  <Icon size={20} />
                  <strong>{v}</strong>
                  <span>{n}</span>
                </div>
              ))}
            </div>
            <div className="dashboard-grid">
              <section className="admin-section">
                <h2>Lượt nghe theo địa điểm</h2>
                {locations.map((p) => {
                  const n =
                    stats.byLocation.find((x) => x.id === p.id)?.count || 0;
                  return (
                    <div className="stat-row" key={p.id}>
                      <span>{locationName(p.id)}</span>
                      <strong>{n}</strong>
                      <progress
                        max={Math.max(
                          1,
                          ...stats.byLocation.map((x) => x.count),
                        )}
                        value={n}
                      />
                    </div>
                  );
                })}
              </section>
              <section className="admin-section">
                <h2>Ngôn ngữ được nghe</h2>
                {stats.byLanguage.length ? (
                  stats.byLanguage.map((x) => (
                    <div className="stat-row" key={x.language}>
                      <span>
                        {languages.find((l) => l.code === x.language)
                          ?.nativeName || x.language}
                      </span>
                      <strong>{x.count}</strong>
                      <progress max={stats.total || 1} value={x.count} />
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Chưa có lượt nghe. Bắt đầu một câu chuyện trong ứng dụng du
                    khách.
                  </p>
                )}
                <h2>Theo ngày (UTC)</h2>
                {stats.byDay.map((x) => (
                  <div className="simple-row" key={x.date}>
                    <span>{x.date.slice(0, 10)}</span>
                    <strong>{x.count}</strong>
                  </div>
                ))}
              </section>
            </div>
            <section className="admin-section">
              <h2>Phản hồi gần đây</h2>
              {stats.feedbacks.length ? (
                stats.feedbacks.map((x) => (
                  <div key={x.id} className="feedback-row">
                    <strong>
                      {locationName(x.locationId)} · {x.rating} ★
                    </strong>
                    <p>{x.comment || "—"}</p>
                    <small>
                      {new Date(x.createdAt + "Z").toLocaleDateString("vi-VN")}
                    </small>
                  </div>
                ))
              ) : (
                <p className="muted">Chưa có phản hồi.</p>
              )}
            </section>
          </>
        )}
        {tab === "locations" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Địa điểm</th>
                  <th>GPS</th>
                  <th>Geofence</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {locations.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{locationName(p.id)}</strong>
                      <small>{p.address}</small>
                    </td>
                    <td>
                      {p.latitude}
                      <br />
                      {p.longitude}
                    </td>
                    <td>{p.radiusM} m</td>
                    <td>
                      <span className={`pill ${p.isActive ? "" : "draft"}`}>
                        {p.isActive ? "Hoạt động" : "Đã tắt"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setForm({ ...p })}
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "languages" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ngôn ngữ</th>
                  <th>Mã</th>
                  <th>Giọng TTS</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {languages.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.nativeName}</strong>
                      <small>
                        {l.name} {l.isDefault ? "· Mặc định" : ""}
                      </small>
                    </td>
                    <td>{l.code}</td>
                    <td>{l.ttsVoiceCode}</td>
                    <td>
                      <span className={`pill ${l.isActive ? "" : "draft"}`}>
                        {l.isActive ? "Hoạt động" : "Đã tắt"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="text-button"
                        onClick={() => setForm({ ...l })}
                      >
                        Chỉnh sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {tab === "translations" && (
          <>
            <label className="filter-language">
              Lọc ngôn ngữ{" "}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Tất cả</option>
                {languages.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Thuyết minh</th>
                    <th>Ngôn ngữ</th>
                    <th>Trạng thái</th>
                    <th>Audio</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {translations
                    .filter((x) => !filter || x.languageId === +filter)
                    .map((x) => (
                      <tr key={x.id}>
                        <td>
                          <strong>{x.name}</strong>
                          <small>{locationName(x.locationId)}</small>
                        </td>
                        <td>
                          {
                            languages.find((l) => l.id === x.languageId)
                              ?.nativeName
                          }
                        </td>
                        <td>
                          <span
                            className={`pill ${x.status === "Draft" ? "draft" : ""}`}
                          >
                            {x.status === "Published"
                              ? "Đã xuất bản"
                              : "Bản nháp"}
                          </span>
                        </td>
                        <td>
                          {x.audioUrl ? (
                            <Volume2 size={17} />
                          ) : (
                            <span className="muted">TTS trình duyệt</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="text-button"
                            onClick={() =>
                              setForm({
                                ...x,
                                status:
                                  user.role === "Admin" ? x.status : "Draft",
                              })
                            }
                          >
                            Biên tập
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === "logs" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian (UTC)</th>
                  <th>Tài khoản</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((x) => (
                  <tr key={x.id}>
                    <td>{x.createdAt.replace("T", " ").slice(0, 19)}</td>
                    <td>{x.username}</td>
                    <td>
                      <code>{x.action}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!logs.length && (
              <p className="empty-state">Chưa có thao tác quản trị.</p>
            )}
          </div>
        )}
        {tab === "users" && (
          <section className="admin-section">
            <Users size={30} />
            <h2>Phân quyền cộng tác</h2>
            <p>
              Admin quản lý ngôn ngữ, tài khoản, duyệt xuất bản và xóa dữ liệu.
              Editor biên tập địa điểm, lưu nội dung nháp và tải audio.
            </p>
            <p className="muted">
              Tài khoản tạo mới đăng nhập bằng trang CMS. Phiên đăng nhập hết
              hạn sau 4 giờ.
            </p>
          </section>
        )}
      </main>
      {form && (
        <div className="modal-backdrop editor-backdrop">
          <section
            className="editor-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editor-title"
          >
            <header>
              <div>
                <span className="eyebrow">CONTENT EDITOR</span>
                <h2 id="editor-title">
                  {form.id ? "Chỉnh sửa" : "Tạo mới"} ·{" "}
                  {tabs.find((x) => x[0] === tab)?.[1]}
                </h2>
              </div>
              <button
                aria-label="Đóng"
                className="icon-button"
                onClick={() => setForm(null)}
              >
                <X />
              </button>
            </header>
            <form onSubmit={save} className="editor-form">
              {tab === "locations" && (
                <>
                  {field("slug", "Slug", "text", {
                    required: true,
                    pattern: "[a-z0-9]+(-[a-z0-9]+)*",
                    maxLength: 150,
                  })}
                  {field("displayOrder", "Thứ tự", "number")}
                  {field("latitude", "Vĩ độ", "number", {
                    required: true,
                    step: "any",
                    min: -90,
                    max: 90,
                  })}
                  {field("longitude", "Kinh độ", "number", {
                    required: true,
                    step: "any",
                    min: -180,
                    max: 180,
                  })}
                  {field("radiusM", "Bán kính (m)", "number", {
                    required: true,
                    min: 10,
                    max: 2000,
                  })}
                  {field("priority", "Ưu tiên", "number")}
                  {field("address", "Địa chỉ", "text", { maxLength: 500 })}
                  {field("openingHours", "Giờ mở cửa", "text", {
                    maxLength: 500,
                  })}
                  {field("imageUrl", "URL ảnh (https:// hoặc /images/...)")}
                  {checkbox("isActive", "Đang hoạt động")}
                </>
              )}
              {tab === "languages" && (
                <>
                  {field("code", "Mã ISO (vi, en, fr...)", "text", {
                    required: true,
                  })}
                  {field("name", "Tên ngôn ngữ", "text", { required: true })}
                  {field("nativeName", "Tên bản địa", "text", {
                    required: true,
                  })}
                  {field("ttsVoiceCode", "Mã giọng (vi-VN, en-US...)", "text", {
                    required: true,
                  })}
                  {checkbox("isActive", "Đang hoạt động")}
                  {checkbox("isDefault", "Ngôn ngữ mặc định")}
                </>
              )}
              {tab === "translations" && (
                <>
                  <label>
                    Địa điểm
                    <select
                      value={form.locationId}
                      onChange={(e) =>
                        setForm({ ...form, locationId: +e.target.value })
                      }
                    >
                      {locations.map((p) => (
                        <option key={p.id} value={p.id}>
                          {locationName(p.id)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ngôn ngữ
                    <select
                      value={form.languageId}
                      onChange={(e) =>
                        setForm({ ...form, languageId: +e.target.value })
                      }
                    >
                      {languages.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nativeName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="full-field machine-translation">
                    <Languages size={18} />
                    <span>
                      Dịch từ bản gốc tiếng Việt, kiểm duyệt trước khi xuất bản.
                    </span>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          const result = await post(
                            "/admin/translations/auto-translate",
                            {
                              locationId: form.locationId,
                              languageId: form.languageId,
                            },
                            token,
                          );
                          setForm({ ...result, id: form.id });
                        }, "Đã nhận bản dịch nháp. Hãy kiểm tra và lưu.")
                      }
                    >
                      Dịch tự động
                    </button>
                  </div>
                  {field("name", "Tên địa điểm", "text", {
                    required: true,
                    maxLength: 300,
                  })}
                  <label>
                    Trạng thái
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value })
                      }
                    >
                      <option value="Draft">Bản nháp</option>
                      {user.role === "Admin" && (
                        <option value="Published">Đã duyệt · Xuất bản</option>
                      )}
                    </select>
                  </label>
                  {field("shortDescription", "Mô tả ngắn", "textarea", {
                    maxLength: 2000,
                  })}
                  {field("narrationText", "Nội dung thuyết minh", "textarea", {
                    required: true,
                    maxLength: 20000,
                    rows: 7,
                  })}
                  {field(
                    "historyText",
                    "Lịch sử & thông tin thêm",
                    "textarea",
                    { maxLength: 20000, rows: 5 },
                  )}
                  {checkbox(
                    "isMachineTranslated",
                    "Nội dung có sử dụng dịch máy",
                  )}
                  {form.id && (
                    <div className="full-field media-editor">
                      <h3>Audio</h3>
                      {form.audioUrl && <audio controls src={form.audioUrl} />}
                      <div>
                        <label className="upload-button">
                          <Upload size={15} />
                          Tải MP3 / WAV / OGG (≤20MB)
                          <input
                            aria-label="Tải audio"
                            type="file"
                            accept="audio/mpeg,audio/wav,audio/ogg"
                            disabled={busy}
                            onChange={(e) => {
                              const f = e.target.files[0];
                              if (!f) return;
                              const data = new FormData();
                              data.append("translationId", form.id);
                              data.append("file", f);
                              action(async () => {
                                const a = await api("/admin/audio/upload", {
                                  method: "POST",
                                  body: data,
                                  token,
                                });
                                setForm({ ...form, audioUrl: a.url });
                              }, "Đã tải audio");
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            action(async () => {
                              const a = await post(
                                "/admin/audio/generate",
                                { translationId: form.id },
                                token,
                              );
                              setForm({ ...form, audioUrl: a.url });
                            }, "Đã sinh audio bằng Azure")
                          }
                        >
                          <Volume2 size={15} />
                          Sinh giọng đọc
                        </button>
                      </div>
                      <small>
                        Lưu nội dung trước khi sinh/tải audio. Đổi văn bản hoặc
                        ngôn ngữ sẽ gỡ liên kết audio cũ.
                      </small>
                    </div>
                  )}
                </>
              )}
              {tab === "users" && (
                <>
                  {field("username", "Tên đăng nhập", "text", {
                    required: true,
                    minLength: 3,
                    maxLength: 100,
                    autoComplete: "off",
                  })}
                  {field("fullName", "Họ tên")}
                  {field(
                    "password",
                    "Mật khẩu mới (ít nhất 12 ký tự)",
                    "password",
                    {
                      required: true,
                      minLength: 12,
                      maxLength: 100,
                      autoComplete: "new-password",
                    },
                  )}
                  <label>
                    Vai trò
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm({ ...form, role: e.target.value })
                      }
                    >
                      <option>Editor</option>
                      <option>Admin</option>
                    </select>
                  </label>
                </>
              )}
              {error && (
                <div className="error-box full-field" role="alert">
                  {error}
                </div>
              )}
              {notice && <div className="success-box full-field">{notice}</div>}
              <footer className="full-field editor-footer">
                {form.id && user.role === "Admin" && (
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Xóa bản ghi này? Dữ liệu có liên kết sẽ được bảo vệ.",
                        )
                      )
                        action(
                          () =>
                            api(`/admin/${tab}/${form.id}`, {
                              method: "DELETE",
                              token,
                            }),
                          "Đã xóa",
                        ).then((ok) => ok && setForm(null));
                    }}
                  >
                    <Trash2 size={16} />
                    Xóa
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setForm(null)}
                >
                  Hủy
                </button>
                <button className="primary" disabled={busy}>
                  <Save size={16} />
                  Lưu thay đổi
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
