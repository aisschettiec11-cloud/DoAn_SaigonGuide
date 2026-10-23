# Kiểm thử và nghiệm thu

## Tự động

- `dotnet test AudioGuide.sln --collect:"XPlat Code Coverage"`: xUnit, EF InMemory cho unit nghiệp vụ; coverage Cobertura trong `backend/AudioGuide.Tests/TestResults`. Các test HTTP Azure dùng fake handler, không phát sinh phí.
- `npm --prefix frontend test`: Vitest cho khoảng cách/debounce/hysteresis/cooldown/priority và HTTP client.
- `python3 scripts/integration.py`: HTTP API với MySQL thật đã chạy. Không reset dữ liệu. Có tạo tài khoản test, lượt nghe và phản hồi thử; chỉ dùng database phát triển.
- `npm --prefix frontend run test:e2e`: Playwright Chromium với ứng dụng/API đang chạy; mock GPS và giọng TTS, các dữ liệu API còn lại đi qua backend thật. Chạy một worker để không gây nhiễu hạn mức login.
- `CLOUD_TLS_BRIDGE=1`: tùy chọn **chỉ cho bài test cloud** nếu Chromium không tin CA proxy môi trường. Chuyển tiếp request tile OSM qua `curl` có TLS verification sẵn trên host. Không thay trust store, không dùng `ignoreHTTPSErrors`, không tắt xác minh TLS. Không dùng tùy chọn này khi muốn kiểm tra trực tiếp đường mạng của trình duyệt.

Các lệnh build, lint, test phải exit 0. Một lượt chạy không có test là lỗi. Các kết quả mới nhất được ghi trong báo cáo bàn giao; không dùng log cũ làm bằng chứng cho phiên bản mới.

## Checklist thử trên điện thoại tại mỗi POI

1. Chuẩn bị HTTPS đáng tin cậy, 6 bản dịch Published và audio phù hợp. Bấm Bắt đầu, chọn ngôn ngữ, cấp quyền GPS.
2. Đi từ ngoài 1.3R vào trong R, ghi timestamp/accuracy từng mẫu ở công cụ debug **trên thiết bị thử**, không đưa tọa độ người dùng vào server log.
3. Xác nhận đủ hai mẫu hợp lệ mới phát; mẫu accuracy >50m không tự phát. Đo độ trễ sau mẫu đủ điều kiện riêng với thời gian từ bước chân qua ranh giới.
4. Ở khu Bưu điện/Đức Bà: xác nhận d/R nhỏ nhất, priority phá hòa; đang nghe A thì B chỉ xuất hiện đề nghị chuyển.
5. Rời vùng rồi quay lại trong 30 phút: không tự phát lại. Nút nghe thủ công vẫn phát. Reload cùng tab không làm mất cooldown.
6. Đổi từng ngôn ngữ: thẻ/giọng đổi đúng. Draft/thiếu ngôn ngữ dùng tiếng Anh và thông báo; không có tiếng Anh thì báo chưa có nội dung.
7. Thử pause/resume/stop/seek/speed với file audio. Với TTS, seek là vị trí văn bản. Nghe hết thì thống kê completed tăng; bấm phát bị chặn không tăng.
8. Từ chối GPS, tắt mạng sau khi mở nội dung, thiết bị thiếu voice: có thông báo và có thể đọc/chọn điểm thủ công. Không kỳ vọng tile/offline hoàn chỉnh.
9. Kiểm tra trên màn hình 390×844, desktop, light/dark, keyboard focus, screen reader nhãn chính; kiểm tra nội dung CJK/Thái và zoom chữ.
10. Không dùng minh họa và văn bản seed như nội dung đã được đơn vị vận hành xác thực.

## Kiểm thử CMS

Admin tạo Editor; Editor không được quản lý ngôn ngữ/tài khoản/xóa hoặc Publish. Editor nhập Draft, Admin duyệt rồi Publish. Thử trùng cặp, slug trùng, tọa độ/bán kính sai, file không phải audio, vượt 20MB, lỗi provider và mất kết nối. Xóa bản có quan hệ trả 409; tắt hoạt động để bảo toàn lịch sử. Chỉ nội dung đã duyệt và ngôn ngữ/POI active xuất hiện cho du khách.

## Giới hạn dữ liệu thống kê

Lượt nghe là số lần player phát `onstart`/`onplaying`, không phải số người duy nhất và không xác minh người dùng thực sự nghe. `session_id` ngẫu nhiên trong sessionStorage, không lưu GPS chi tiết. Client ẩn danh có thể gửi log giả; rate limit chỉ giảm lạm dụng, không phải chứng thực analytics. Ngày trên dashboard dùng UTC.
