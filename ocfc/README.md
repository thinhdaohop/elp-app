# App CLB Ocean City FC

Bản nhân bản App CLB Eleven Park cho Ocean City FC. Giữ nguyên toàn bộ tính năng: vote điểm danh, check-in GPS, Sao đỏ, ví quỹ, trận đấu, giải đấu, tài sản, hồ sơ.

Khác bản ELP:
- Phạt thi đấu, thẻ vàng, thẻ đỏ = 0đ (chỉ ghi nhận để thống kê).
- Mọi lỗi nội quy đồng giá 50.000đ/lỗi.
- Logo thuyền buồm, màu Deep Ocean Blue `#0A2E52` / Aqua Teal `#1CA39E` / Ivory White `#F8F8F1`.
- Lưu đăng nhập riêng (khóa `ocfc_*`), không đụng phiên của app ELP dù chạy cùng tên miền.

Dữ liệu và xử lý: Google Apps Script "CODE APPS SCRIPT - QUY OCFC 2026 v1" gắn với file "QUỸ OCEAN CITY FC 2026". Danh sách thành viên đọc từ tab 2026 của file quỹ.

Link app: https://thinhdaohop.github.io/OCFC/ (repo `OCFC`, bật GitHub Pages nhánh main).

Cài đặt: deploy Apps Script thành Ứng dụng web, dán URL `/exec` vào mục `API` trong `config.js`.
