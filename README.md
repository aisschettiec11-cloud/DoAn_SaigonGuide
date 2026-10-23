# Saigon Guide — TP.HCM Audio Guide

Ứng dụng thuyết minh đa ngôn ngữ theo GPS theo [PRD](https://docs.google.com/document/d/1CWlcED2HsSM4Nj9AEbBLUNVlzJnbEkbUR795kucsPDA/edit). React/PWA, Leaflet + OpenStreetMap, ASP.NET Core .NET 8 theo 3 lớp, EF Core/Pomelo, MySQL 8 và phpMyAdmin.

## Chạy localhost

Cần Docker Desktop (Docker Engine + Compose v2 trên Linux) và Python 3. Không cần cài PHP, Node hay .NET nếu dùng Docker.

```bash
python3 scripts/init-env.py
docker compose up -d --build
```

Lần đầu mất vài phút tải image/thư viện. API tự áp dụng EF migration, tạo bảng và seed **6 điểm × 6 ngôn ngữ** trong database `saigon_audio_guide`. Volume giữ dữ liệu qua các lần khởi động. Script tạo `.env` chỉ chạy lần đầu và không ghi đè cấu hình cũ.

| Thành phần | Địa chỉ trên máy chạy |
| --- | --- |
| Ứng dụng | `http://localhost:8080` |
| Quản trị nội dung | `http://localhost:8080/admin` |
| phpMyAdmin | `http://localhost:8081` |
| Swagger/OpenAPI | `http://localhost:8080/swagger` |
| Health check | `http://localhost:8080/health` |
| MySQL | `127.0.0.1:3306` |

**Đăng nhập CMS:** tên trong `ADMIN_USERNAME` (mặc định `admin`), mật khẩu riêng được sinh trong `ADMIN_PASSWORD` của `.env`. Mở tệp này trên máy của bạn; không chia sẻ hoặc commit. Đổi `ADMIN_PASSWORD` sau khi database đã có tài khoản sẽ không thay mật khẩu trong database. Cần sao lưu trước khi thực hiện quản trị tài khoản trực tiếp.

**phpMyAdmin:** server `db`, user `guide`, mật khẩu `MYSQL_PASSWORD` trong `.env`; chọn database `saigon_audio_guide`. Root chỉ dùng khi cần quản trị cấp server, với `MYSQL_ROOT_PASSWORD`. phpMyAdmin và cổng MySQL chỉ bind vào loopback.

```bash
docker compose ps
docker compose logs --tail=80 api
docker compose stop       # dừng, giữ dữ liệu
docker compose up -d      # mở lại
```

Không chạy `docker compose down -v` khi còn dữ liệu cần giữ. Máy có MySQL đang dùng cổng 3306 thì sửa cổng **phía máy host** trong `compose.yml`, ví dụ `127.0.0.1:3307:3306`. Các container vẫn dùng `db:3306`.

## Những luồng đã triển khai

- Chọn/lưu ngôn ngữ; giao diện Việt, Anh, Hàn, Nhật, Trung, Thái; CMS thêm ngôn ngữ/nội dung bằng dữ liệu. Với ngôn ngữ giao diện mới chưa có từ điển, nhãn hiển thị tiếng Anh.
- Bản đồ Leaflet: marker, vùng geofence, vị trí/sai số GPS, danh sách/khoảng cách, tìm kiếm, chọn điểm, đường thẳng đến điểm. Đường thẳng **không phải** lộ trình đi bộ, không dùng để băng qua công trình/đường nguy hiểm.
- Theo dõi GPS; Haversine phía server; lọc sai số >50m, hysteresis 1.3R, debounce hai mẫu hợp lệ; so d/radius, rồi priority để xử lý chồng lấn. Cooldown 30 phút trong cùng phiên tab (cả khi reload), nghe lại thủ công và xác nhận trước khi đổi điểm đang phát.
- Nội dung đã xuất bản theo ngôn ngữ; thiếu bản dịch thì dùng tiếng Anh kèm thông báo. Nội dung nháp không xuất hiện ở API du khách.
- Audio ưu tiên file, dự phòng Web Speech API; phát/tạm dừng/tiếp tục/dừng/tốc độ/tua. Tua TTS theo vị trí ký tự, không phải giây. Thiếu giọng phù hợp thì báo rõ, vẫn đọc được văn bản.
- Tiến độ tham quan ở localStorage; log lượt nghe ẩn danh chỉ ghi khi bắt đầu phát và cập nhật hoàn tất; đánh giá 1–5 sao. Không lưu lịch sử tọa độ du khách.
- CMS JWT + BCrypt, phân quyền Admin/Editor; CRUD địa điểm, ngôn ngữ, nội dung; duyệt xuất bản; tải MP3/WAV/OGG (tối đa 20MB); dashboard theo ngày/điểm/ngôn ngữ; phản hồi và nhật ký.
- Dịch máy và sinh MP3 qua Azure là tích hợp tùy chọn, có lỗi rõ khi chưa cấu hình. Dịch máy trả **bản nháp**, phải lưu/duyệt thủ công. Audio cũ bị gỡ liên kết khi đổi văn bản/ngôn ngữ.
- Chế độ tối, responsive, PWA cache shell/nội dung đã tải để đọc lại khi mất mạng. Không cam kết offline đầy đủ; GPS API phía server, bản đồ và giọng TTS có thể cần mạng.

## GPS, audio và dữ liệu mẫu

Chrome/Edge xem `localhost` là secure context, nên GPS có thể chạy qua HTTP tại localhost. **Điện thoại truy cập IP LAN cần HTTPS** với chứng chỉ được thiết bị tin cậy; cấu hình reverse proxy/TLS trước khi thử thực địa. Các cổng hiện bind `127.0.0.1`, cần chủ động cấu hình riêng nếu muốn truy cập qua mạng LAN.

Bấm “Khám phá ngay”, rồi “Bật định vị” để cấp quyền. Trình duyệt có thể vẫn chặn tự phát audio sau một thời gian; khi đó bấm nút nghe. Cài giọng đọc tương ứng trên hệ điều hành hoặc tải/sinh audio trong CMS để tránh phụ thuộc giọng TTS thiết bị.

Dùng Chrome DevTools → Sensors để giả lập vị trí. Ví dụ Bưu điện: `10.7799, 106.6999`, accuracy ≤50m; cần ít nhất hai lần cập nhật GPS hợp lệ cách nhau ≥1.5 giây. Khi accuracy >50m, tự phát tạm dừng. Chọn một điểm trong danh sách để nghe mà không bật GPS.

Ảnh là minh họa SVG tự tạo, không phải ảnh chụp địa điểm. Văn bản ngắn đa ngôn ngữ là **nội dung mẫu**, cần nhóm biên tập kiểm chứng lịch sử, bản dịch, giờ mở cửa, tọa độ và bán kính trước khi sử dụng thực tế. Ghi chú giờ mở cửa seed chưa thay cho lịch chính thức.

## Dịch máy / sinh audio (tùy chọn)

Đặt các giá trị riêng trong `.env`, rồi `docker compose up -d api`:

```dotenv
AZURE_TRANSLATOR_KEY=
AZURE_TRANSLATOR_REGION=
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
```

Tạo tài nguyên Azure AI Translator và Azure AI Speech phù hợp; dùng key/region của tài nguyên đó. Backend gọi `api.cognitive.microsofttranslator.com` và `<region>.tts.speech.microsoft.com` qua HTTPS. Có thể phát sinh phí dịch vụ. Không cần các key này cho nhập bản dịch/tải audio/TTS trình duyệt. Nếu không có, các nút dịch/sinh audio trả thông báo 503; các chức năng còn lại tiếp tục hoạt động.

## Phát triển trực tiếp

Cần .NET SDK 8, Node 22+, Python 3; Docker chạy MySQL.

```bash
python3 scripts/init-env.py
docker compose up -d db phpmyadmin
python3 scripts/run-api.py                 # terminal 1: API 127.0.0.1:5080
cd frontend
npm ci
npm run dev                               # terminal 2: Vite 5173, proxy API/media
```

Native Swagger ở `http://127.0.0.1:5080/swagger`. Cấu hình CORS mặc định chỉ cho localhost 5173/8080. Với Docker dùng cùng origin qua Nginx. Script native đọc `.env` ở root, không in giá trị bí mật. Nếu dùng binary .NET riêng, đặt `DOTNET_EXE` thành đường dẫn binary.

## Kiểm thử

```bash
dotnet test AudioGuide.sln --collect:"XPlat Code Coverage"
cd frontend
npm ci
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e                            # cần API + Vite đang chạy
```

Từ root, `python3 scripts/integration.py` kiểm thử HTTP với **MySQL thật** (mặc định API 5080); đặt `API_BASE=http://127.0.0.1:8080` để kiểm thử Docker. E2E với Docker dùng `E2E_BASE_URL=http://127.0.0.1:8080 npm --prefix frontend run test:e2e`.

Integration tạo tài khoản editor có tên `test-editor-*`, log/phản hồi được đánh dấu thử nghiệm, rồi xóa địa điểm/ngôn ngữ tạm do bài test tạo. Các log, tài khoản thử và phản hồi được giữ để kiểm tra thống kê; **không chạy trên database production**. E2E giả lập API GPS/giọng đọc để kiểm tra trạng thái và luồng nghiệp vụ, không chứng nhận khả năng phát âm của giọng thực tế.

Xem [kết quả kiểm tra bàn giao](docs/VALIDATION.md), [kế hoạch kiểm thử thực địa](docs/TESTING.md), [kiến trúc/UML](docs/ARCHITECTURE.md) và [đối chiếu PRD](docs/REQUIREMENTS.md).

## Migration và sao lưu

Migration đầu tiên nằm trong `backend/AudioGuide.Data/Migrations`; API áp dụng migration lúc startup trước khi phục vụ request. Nếu nâng cấp schema, tạo migration mới và sao lưu dữ liệu trước. Với nhiều API instance, chạy migration bằng một tác vụ duy nhất trước khi scale.

```bash
dotnet tool install --global dotnet-ef --version 8.0.13
dotnet ef migrations add TenMigration --project backend/AudioGuide.Data --startup-project backend/AudioGuide.Api
dotnet ef migrations script --idempotent --project backend/AudioGuide.Data --startup-project backend/AudioGuide.Api
```

Có thể export bằng phpMyAdmin. Cần sao lưu **cả database và volume audio-data**, không chỉ mã nguồn. Audio thay thế bị gỡ liên kết nhưng tệp cũ được giữ để tránh xóa nội dung đang được cache; cần quy trình dọn file không còn tham chiếu sau khi backup.

## CI/CD và giới hạn triển khai

GitHub Actions CI chạy build/test backend, lint/test/build frontend, integration và E2E trên Docker. Workflow xuất bản image GHCR chạy **thủ công** khi bạn chọn, dùng GitHub token của Actions. Chưa cấu hình tự deploy máy chủ vì mục tiêu hiện tại là localhost; chưa push mã hay chạy workflow ở GitHub trong phiên này.

Đối với Internet: cấu hình HTTPS, sao lưu, kiểm thử tải, quản lý vòng đời tài khoản/JWT, cấu hình trusted proxy/rate limit theo IP thực, kiểm duyệt nội dung và giám sát. Cấu hình hiện tại phục vụ phát triển/demo localhost.


## Môi trường cloud có proxy

Nếu BuildKit trong cloud không phân giải được proxy hoặc thiếu CA doanh nghiệp, dùng `python3 scripts/cloud-build.py`, rồi `python3 scripts/start.py`. Helper đọc hostname proxy/CA hiện có, dùng DNS đã được môi trường cung cấp, không lưu credentials vào mã và giữ nguyên xác minh TLS. Đây là helper cho môi trường cloud; cách chạy localhost thông thường vẫn là hai lệnh ở đầu tài liệu.
