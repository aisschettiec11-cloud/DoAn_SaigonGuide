# Kết quả kiểm tra bàn giao

Ngày 23/10/2026, kiểm tra trong môi trường cloud hiện tại; không phải chứng nhận production hay thực địa.

| Kiểm tra | Kết quả |
| --- | --- |
| Build ASP.NET Core .NET 8 | Thành công, cả native và image runtime chạy user app |
| xUnit backend | 38 passed, 0 failed, 0 skipped |
| Coverlet Business | 100% line / 94.44% branch theo báo cáo Cobertura của lượt chạy hiện tại |
| Frontend ESLint | Passed |
| Vitest frontend | 10 passed, 0 failed |
| Vite production build | Passed; client chính khoảng 121 KB gzip, CMS tách chunk |
| Docker image API và web | Build thành công; TLS và checksum giữ nguyên |
| Docker Compose | MySQL 8 + API + Nginx/React + phpMyAdmin đang chạy |
| MySQL migration/seed | Schema mới saigon_audio_guide, 8 bảng nghiệp vụ + EF history, 6 điểm × 6 ngôn ngữ |
| HTTP integration qua Nginx/MySQL thật | 65 assertions passed, gồm upload/serve WAV và audio invalidation |
| Benchmark smoke localhost | 20 request tuần tự GET locations, p95 khoảng 30.1ms; không đại diện tải đồng thời/4G |
| Playwright trên Docker | 6 passed, gồm mobile, đổi ngôn ngữ, player, phản hồi, GPS từ chối/sai số/debounce/cooldown/chuyển điểm, CMS |
| Swagger và phpMyAdmin | Phản hồi HTTP thành công |

E2E dùng mô phỏng Speech API/GPS và chuyển tiếp tile OSM qua `curl` TLS trong bài test vì kho CA của Chromium trong cloud không tin proxy. Ảnh tile thật được yêu cầu với User-Agent nhận diện ứng dụng và Referer, theo chính sách sử dụng OSM. Kiểm tra này không cài CA lâu dài, không tắt xác minh TLS và không sửa đường tải tile của ứng dụng khi chạy thông thường.

Bước build cloud cần ánh xạ hostname proxy đã cấu hình vào BuildKit, cùng CA bundle đọc từ môi trường bằng BuildKit secret. `scripts/cloud-build.py` thực hiện các bước này, không ghi proxy credential vào repo/runtime image. Docker localhost thông thường dùng trực tiếp `docker compose up -d --build`.

Một database thử trước migration (`saigon_guide`) được giữ nguyên. Database ứng dụng là `saigon_audio_guide`; không reset volume hay dữ liệu có sẵn. Tài khoản/lượt nghe/phản hồi thử nghiệm được đánh dấu trong database phát triển; không dùng kết quả tổng thống kê làm dữ liệu khách thực tế.

Đã lưu `install_script` và `start_skill` trong bản nháp cấu hình môi trường; chưa publish snapshot, chưa kiểm chứng khôi phục ở task mới và chưa push/triển khai lên GitHub/máy chủ ngoài. Azure live translation/TTS chưa kiểm tra vì chưa cung cấp key/region. Thử GPS/âm thanh thực địa, KPI mạng 4G và kiểm duyệt nội dung vẫn cần thực hiện trước nghiệm thu thực tế.

Ảnh giao diện trong [screenshots](screenshots/) minh họa dữ liệu mẫu ở desktop, mobile và CMS; không chứa mật khẩu.
