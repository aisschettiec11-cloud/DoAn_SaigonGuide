# Đối chiếu PRD

Nguồn: `docs/PRD.txt` và tài liệu Google Docs được cung cấp. Ưu tiên triển khai chạy localhost đúng stack.

| ID | Phần triển khai / ghi chú |
| --- | --- |
| FR-01 | Chọn/lưu ngôn ngữ và đổi trong header; API lấy language active |
| FR-02 | Leaflet + OSM, marker, vùng geofence, vị trí/sai số realtime |
| FR-03 | watchPosition, lỗi quyền/timeout/unavailable, nghe thủ công |
| FR-04 | Haversine server + debounce/hysteresis/cooldown client; test GPS giả lập |
| FR-05 | Thẻ chi tiết, tên/mô tả/lịch sử theo narration; ảnh minh họa, địa chỉ/giờ cấu hình POI |
| FR-06 | File audio + fallback TTS; play/pause/stop/seek/rate; báo khi thiếu voice |
| FR-07 | Cooldown 30 phút trong sessionStorage cùng phiên tab; nghe thủ công bỏ cooldown |
| FR-08 | Danh sách/tìm kiếm/khoảng cách; chế độ thủ công không cần GPS |
| FR-09 | Đường thẳng trên bản đồ, không phải route theo đường phố |
| FR-10 | Visited/progress localStorage, đánh dấu khi âm thanh bắt đầu |
| FR-11 | Form 1–5 sao + bình luận; CMS xem phản hồi |
| FR-12 | Mobile/desktop, sáng/tối, lưu tùy chọn |
| FR-20 | JWT 4h, BCrypt, chính sách Admin/Editor; Admin tạo tài khoản |
| FR-21 | CMS CRUD địa điểm + bảo toàn khóa ngoại khi xóa |
| FR-22 | CMS CRUD ngôn ngữ, kiểm tra ISO/voice, active/default |
| FR-23 | CMS CRUD translation theo cặp unique, Draft/Published |
| FR-24 | Azure Translator; nhận Draft, chỉnh sửa và Admin xuất bản; **live provider cần key/region** |
| FR-25 | Upload MP3/WAV/OGG; Azure Speech lưu MP3; **live generation cần key/region** |
| FR-26 | Tổng/completed, theo POI/ngôn ngữ/ngày UTC; phản hồi |
| FR-27 | Nhật ký thao tác CMS; không chứa văn bản thuyết minh hoặc secrets |

## Quy tắc đã kiểm thử tự động

Haversine, thứ tự d/R và priority; sai số; debounce; hysteresis; cooldown; fallback Anh; draft không lộ; location/language inactive; JWT/RBAC; unique và foreign key; xuất bản; audio invalidation khi đổi nội dung; file type/size; sinh/translate qua HTTP giả lập; dữ liệu seed và tính lặp lại; log bắt đầu/hoàn tất; feedback; responsive và tương tác CMS.

## Cần kiểm tra trong điều kiện thật

- GPS trên thiết bị tại 6 điểm, tỷ lệ đúng ≥90%, độ trễ từ mẫu GPS đến playback. PRD vừa yêu cầu 2 mẫu (3–5 giây), vừa yêu cầu vào geofence đến phát ≤3 giây: cần thống nhất cách đo KPI. Hiện debounce 2 mẫu hợp lệ, callback xử lý tối thiểu cách nhau 1.5 giây; không thể bảo đảm trình duyệt trả GPS theo nhịp cố định.
- Audio/voice thực tế trên iOS/Android; autoplay policy và voice cài trên máy. Mẫu kiểm thử mô phỏng Speech API chỉ kiểm tra logic giao diện, không nghe/chấm chất lượng âm thanh.
- Azure Translation/Speech với tài khoản, quota, vùng và nội dung thật. Unit test dùng phản hồi giả lập; không tuyên bố đã gọi provider thật.
- Chất lượng bản dịch, thông tin lịch sử, bản quyền ảnh/audio, giờ mở cửa và đo lại tọa độ thực địa.
- Hiệu năng 4G, p95 dưới tải đồng thời, uptime 99%, WCAG audit đầy đủ. Benchmark localhost không đủ chứng minh các KPI này.
- CI được cung cấp nhưng chưa chạy trên GitHub; CD chỉ có workflow build/publish image thủ công. Chưa có máy chủ/SSH/HTTPS đích để deploy.

Các thư viện tiện ích trong PRD như AutoMapper/FluentValidation không phải điều kiện chạy; bản này ánh xạ DTO tường minh, validation ở service và DataAnnotations. API dùng minimal endpoints thay vì Controllers; vẫn giữ đường phụ thuộc Presentation → Business → Data. Production cần kiểm tra phân trang/thời gian truy vấn khi dữ liệu log lớn, lưu phiên bản nội dung/audio, quản lý vòng đời tài khoản, rotation/revocation JWT và rate limit ở trusted reverse proxy.
