# Kiến trúc và sơ đồ

Mã nguồn bám kiến trúc 3 lớp. Presentation ở `AudioGuide.Api` nhận request, xác thực, kiểm tra dữ liệu và gọi interface dịch vụ. Business ở `AudioGuide.Business` xử lý geofence, narration/fallback, auth, xuất bản, thống kê và tích hợp Azure. Data ở `AudioGuide.Data` quản lý entities, DbContext, Repository và migration MySQL. DI nối interface với implementation; truy vấn EF tham số hóa.

## Use case

```mermaid
flowchart LR
 Tourist[Du khách] --> Language([Chọn ngôn ngữ])
 Tourist --> Map([Xem bản đồ / GPS])
 Tourist --> Auto([Nhận thuyết minh tự động])
 Tourist --> Manual([Chọn điểm / nghe thủ công])
 Tourist --> Player([Điều khiển audio])
 Tourist --> Directions([Chỉ đường])
 Tourist --> Feedback([Gửi đánh giá])
 GPS[GPS thiết bị] --> Auto
 Admin[Admin / Editor] --> Login([Đăng nhập JWT])
 Admin --> POI([Quản lý địa điểm])
 Admin --> Content([Biên tập bản dịch])
 Admin --> Audio([Tải / sinh audio])
 Admin --> Stats([Thống kê / nhật ký])
 Super[Admin] --> Publish([Duyệt xuất bản])
 Super --> Lang([Quản lý ngôn ngữ / tài khoản])
 Azure[Azure Translator / Speech] --> Content
 Azure --> Audio
```

## Activity — tự động theo GPS

```mermaid
flowchart TD
 A[Bắt đầu và bật GPS] --> B{Có quyền?}
 B -- Không --> Manual[Chọn điểm để nghe thủ công]
 B -- Có --> C[watchPosition nhận mẫu]
 C --> D{Accuracy ≤ 50m?}
 D -- Không --> Warn[Cảnh báo; xóa bộ đếm debounce]
 Warn --> C
 D -- Có --> E[Haversine; vào R, ra trên 1.3R]
 E --> F{Đủ 2 mẫu hợp lệ?}
 F -- Không --> C
 F -- Có --> G[API nearby xác minh; xếp d/R rồi priority]
 G --> H{Đã nghe trong 30 phút?}
 H -- Có --> C
 H -- Không --> I{Đang phát điểm khác?}
 I -- Có --> J[Đề nghị chuyển; người dùng xác nhận]
 J -- Để sau --> C
 J -- Chuyển --> K[Tải narration đã xuất bản / fallback Anh]
 I -- Không --> K
 K --> L{Có file audio?}
 L -- Có --> M[Phát file, dự phòng TTS nếu file lỗi]
 L -- Không --> N{Có giọng phù hợp?}
 N -- Có --> M
 N -- Không --> O[Thông báo; cho đọc văn bản]
 M --> P[onstart/onplaying: ghi lượt nghe; visited; cooldown]
 P --> Q[onended: đánh dấu hoàn tất]
 Q --> C
 O --> C
```

## Activity — biên tập đa ngôn ngữ

```mermaid
flowchart TD
 A[Đăng nhập Admin/Editor] --> B[Chọn địa điểm và ngôn ngữ]
 B --> C[Nhập nội dung hoặc gọi dịch máy từ tiếng Việt]
 C --> D{Dịch vụ đã cấu hình?}
 D -- Không --> E[Nhập thủ công]
 D -- Có --> F[Nhận bản dịch máy dạng Draft]
 E --> G[Chỉnh sửa và lưu Draft]
 F --> G
 G --> H[Admin kiểm chứng / duyệt]
 H --> I[Publish]
 I --> J{Chọn cách cung cấp audio}
 J --> K[Tải file MP3/WAV/OGG]
 J --> L[Azure Speech sinh MP3]
 J --> M[TTS trình duyệt]
 K --> N[Audio được lưu; du khách nghe bản đã duyệt]
 L --> N
 M --> N
```

## Component

```mermaid
flowchart LR
 React[React / i18next / PWA] --> Leaflet[Leaflet + OSM]
 React --> API[Presentation: endpoints, JWT, validation, rate limit]
 API --> BLL[Business: IGuideService, IGeofenceService, IAuthService, IMediaService]
 BLL --> DAL[Data: IRepository → AppDbContext / EF Core]
 DAL --> MySQL[(MySQL 8 / utf8mb4)]
 BLL --> Azure[Azure Translator / Speech]
 BLL --> Media[(Audio storage)]
 Browser[Geolocation / Web Speech API] --> React
```

## Deployment localhost

```mermaid
flowchart LR
 Browser[Trình duyệt localhost:8080] --> Web[Nginx: React static / API reverse proxy]
 Web --> API[ASP.NET Core API:8080 nội bộ]
 API --> DB[(MySQL:3306)]
 API --> Audio[(audio-data volume)]
 API --> Azure[Azure HTTPS tùy chọn]
 PMA[phpMyAdmin localhost:8081] --> DB
 DB --> Volume[(db-data volume)]
 Browser --> OSM[OpenStreetMap tiles HTTPS]
```

Nginx chỉ mở loopback HTTP cho localhost; triển khai điện thoại qua LAN/Internet cần lớp HTTPS và cấu hình mạng riêng. API không publish port từ Docker. MySQL/phpMyAdmin chỉ mở loopback. Container API chạy user `app` không phải root. Build có tùy chọn BuildKit CA secret cho proxy doanh nghiệp; CA chỉ dùng trong lệnh build, không được đưa vào runtime image.

## ERD

```mermaid
erDiagram
 languages ||--o{ location_translations : translates
 locations ||--o{ location_translations : has
 location_translations ||--o| audio_narrations : narrates
 locations ||--o{ play_logs : tracks
 languages ||--o{ play_logs : spoken_in
 locations ||--o{ feedbacks : receives
 languages ||--o{ feedbacks : written_in
 admin_users {
  int id PK
  string username UK
  string password_hash
  string role
  bool is_active
 }
 languages {
  int id PK
  string code UK
  string native_name
  string tts_voice_code
  bool is_default
  bool is_active
 }
 locations {
  int id PK
  string slug UK
  decimal latitude
  decimal longitude
  int radius_m
  int priority
  bool is_active
 }
 location_translations {
  int id PK
  int location_id FK
  int language_id FK
  string name
  text narration_text
  string status
  bool is_machine_translated
 }
 audio_narrations {
  int id PK
  int translation_id FK,UK
  string file_url
  string source
 }
 play_logs {
  bigint id PK
  string session_id
  int location_id FK
  int language_id FK
  string trigger_type
  datetime played_at
  bool completed
 }
 feedbacks {
  bigint id PK
  int location_id FK
  int language_id FK
  int rating
  text comment
 }
 audit_logs {
  bigint id PK
  string username
  string action
  datetime created_at
 }
```

Cặp `(location_id, language_id)` là unique. Index cho địa điểm hoạt động/thứ tự và lượt nghe theo điểm/ngày. Không xóa location/language đã có nội dung, lượt nghe hoặc phản hồi: API trả 409 và hướng dẫn tắt trạng thái. Xóa translation sẽ xóa metadata audio liên quan; file vật lý giữ để không phá cache. Bảng `__EFMigrationsHistory` do EF quản lý.

## Sequence — nghe một điểm

```mermaid
sequenceDiagram
 participant U as Du khách
 participant UI as React
 participant API as API
 participant B as GuideService
 participant D as MySQL
 U->>UI: Chọn điểm hoặc GPS kích hoạt
 UI->>API: GET /api/locations/id/narration?lang=ko
 API->>B: Narration(id, ko)
 B->>D: Published + language active + location active
 alt Thiếu bản ko
 B->>D: Tìm bản en đã xuất bản
 end
 D-->>B: Nội dung + audio
 B-->>UI: DTO và cờ fallback
 UI->>U: Hiện thông tin; phát file/TTS
 UI->>API: POST /api/playlogs (khi thực sự bắt đầu)
 API->>D: Ghi session ẩn danh, không có tọa độ
 UI->>API: PUT /api/playlogs/id/complete (khi kết thúc)
```
