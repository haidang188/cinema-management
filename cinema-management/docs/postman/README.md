# Postman – Cinema Management API

File: `CinemaManagement.postman_collection.json` (12 thư mục, 160 request).

## Cách chạy

1. Chạy backend (`http://localhost:8080`).
2. Postman → **Import** → chọn file collection.
3. Mở collection → tab **Variables**, kiểm tra `baseUrl`, `adminEmail`, `adminPassword`.
4. Chuột phải collection → **Run collection** → chạy theo thứ tự thư mục `00 → 11`.

Không cần Environment. Token, id và mã đơn được script tự lưu vào **Collection Variables**.

## Luồng dữ liệu

| Thư mục | Tạo ra / dùng |
|---|---|
| 00 Setup | `adminToken`, `memberToken` (member ngẫu nhiên), `employeeToken` (nhân viên mới) |
| 02 Admin | `movieId`, `roomId` (phòng 10 ghế), `showtimeId` (ngày mai 19:00) |
| 03 Public | `seat1..seat6` – ghế trống của suất vừa tạo, `promoCode` |
| 04–05 Online | giữ seat1–3 → `holdToken` → đơn VIETQR `bookingCode` → xác nhận thanh toán |
| 07 Quầy | giữ seat4–5 → bán tiền mặt → `counterBookingId`, `ticketCode` |
| 08 Lấy vé | xác nhận lấy vé cho `bookingCode` |

## Lưu ý

- Mỗi lần chạy sẽ tạo thêm 1 phim, 1 phòng, 3 suất chiếu, 1 member, 1 nhân viên trong DB.
- **Tạo khuyến mãi** cần chọn file ảnh cho trường `image` (backend upload lên Cloudinary).
- Thư mục **10** và các request có dấu ⚠️ kiểm tra phân quyền: request nào **fail** (trả 200 thay vì 401/403) là API đang mở cho người chưa đăng nhập.
- Token hết hạn sau 30 phút không dùng và mất khi khởi động lại backend → chạy lại thư mục 00.
- Một số request chấp nhận nhiều mã HTTP (vd `400 | 409`) vì chỉ cần kiểm tra là bị từ chối.
