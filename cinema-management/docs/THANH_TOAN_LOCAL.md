# Cấu hình thanh toán trên máy local

## 1. Các file liên quan

- `backend/src/main/resources/application.properties`: đọc biến môi trường.
- `backend/src/main/java/com/cinemamanagement/config/properties/VietQrProperties.java`: thông tin tài khoản nhận tiền.
- `backend/src/main/java/com/cinemamanagement/config/properties/VnPayProperties.java`: thông tin merchant VNPay.
- `backend/src/main/java/com/cinemamanagement/service/impl/OnlineBookingServiceImpl.java`: tạo đơn, tạo link QR, xử lý kết quả.
- `backend/src/main/java/com/cinemamanagement/service/impl/VnPayServiceImpl.java`: tạo URL và chữ ký VNPay.
- `backend/src/main/java/com/cinemamanagement/controller/OnlinePaymentController.java`: endpoint nhận kết quả.

## 2. VietQR

Chuẩn bị tài khoản ngân hàng nhận tiền, tên chủ tài khoản và mã ngân hàng. Dùng tài khoản của bạn, không dùng số tài khoản ví dụ để chuyển tiền.

Tra mã BIN tại https://api.vietqr.io/v2/banks hoặc tài liệu https://vietqr.io/danh-sach-api/api-danh-sach-ma-ngan-hang/. Trường `bin` là mã cần điền vào `VIETQR_BANK_ID`.

Mở PowerShell tại thư mục backend, thay các giá trị bên dưới:

```powershell
$env:VIETQR_BANK_ID='MA_BIN_NGAN_HANG'
$env:VIETQR_BANK_NAME='TEN_NGAN_HANG'
$env:VIETQR_ACCOUNT_NUMBER='SO_TAI_KHOAN_NHAN_TIEN'
$env:VIETQR_ACCOUNT_NAME='TEN CHU TAI KHOAN KHONG DAU'
$env:VIETQR_TEMPLATE='compact2'
.\gradlew.bat bootRun
```

Các biến chỉ có hiệu lực trong cửa sổ PowerShell này và các tiến trình được chạy từ nó. Dừng backend cũ trước khi chạy lại. Chạy từ IntelliJ thì mở Run → Edit Configurations → cấu hình BackendApplication → Environment variables và thêm từng cặp tên/giá trị, sau đó restart.

Không đặt thông tin này trong `.env` frontend: Spring không tự đọc file đó. Không cần API key cho đường dẫn Quick Link đang dùng trong dự án.

Thử: đăng nhập MEMBER → chọn suất tương lai → chọn ghế → tiếp tục → VietQR → xác nhận. Code tạo URL có `amount` là tổng tiền backend và `addInfo` là mã đặt vé. Dùng ứng dụng ngân hàng quét và kiểm tra tên người nhận, số tiền, nội dung trước khi xác nhận chuyển khoản.

Lưu ý về code hiện tại: nút “Tôi đã thanh toán” đang trực tiếp đánh dấu PAID và phát hành vé. Đây là mô phỏng, không phải xác nhận tiền đã vào ngân hàng; bất kỳ người dùng nào bấm nút cũng có thể nhận vé mà chưa chuyển khoản. Chỉ dùng cho thử nghiệm. Muốn bán vé thật cần nhân viên đối soát hoặc webhook từ dịch vụ xác nhận giao dịch; chỉ hiển thị VietQR không tự xác nhận thanh toán.

Tài liệu Quick Link: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/

## 3. VNPay Sandbox

1. Vào https://sandbox.vnpayment.vn/apis/docs/gioi-thieu/ và mở liên kết đăng ký thông tin kết nối Sandbox trên trang chính thức.
2. Điền thông tin merchant thử nghiệm theo form. Lấy `vnp_TmnCode` và `vnp_HashSecret` được cấp cho cùng merchant. Không dùng các mã demo trong tài liệu làm tài khoản của mình.
3. Điền biến môi trường trong cùng terminal sẽ chạy backend:

```powershell
$env:VNPAY_TMN_CODE='MA_MERCHANT_DUOC_CAP'
$env:VNPAY_HASH_SECRET='CHUOI_BI_MAT_DUOC_CAP'
$env:VNPAY_RETURN_URL='http://localhost:8080/api/payments/vnpay/return'
$env:VNPAY_FRONTEND_RESULT_URL='http://localhost:5173/payment/vnpay-return'
.\gradlew.bat bootRun
```

4. Chạy frontend bằng `npm run dev`, truy cập **http://localhost:5173**. Dùng cùng hostname khi đăng nhập và khi quay về. `localhost` và `127.0.0.1` có localStorage riêng nên đổi hostname có thể khiến trang yêu cầu đăng nhập lại.
5. Chọn VNPay rồi xác nhận. Trình duyệt sẽ sang `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`.
6. Dùng thông tin thẻ thử nghiệm tại https://sandbox.vnpayment.vn/apis/vnpay-demo/. Lấy số thẻ, tên, ngày và OTP đúng theo trang hiện tại, không dùng thẻ ngân hàng thật.
7. Sau khi thao tác thành công, VNPay đưa trình duyệt về backend qua Return URL. Backend kiểm tra chữ ký/số tiền, sau đó chuyển tới frontend để xem kết quả.

`HashSecret` chỉ nằm ở backend, tuyệt đối không thêm tiền tố `VITE_` hoặc đưa vào source frontend. Không commit giá trị thật lên Git.

## 4. Giới hạn và lỗi thường gặp

- “Chưa được cấu hình”: biến môi trường chưa được truyền vào đúng tiến trình Java hoặc chưa restart.
- QR không hiện: kiểm tra mã BIN, số tài khoản, mạng và URL ảnh trong Network của trình duyệt.
- VNPay báo chữ ký sai: kiểm tra TmnCode/HashSecret cùng merchant, khoảng trắng và cách URL-encode theo mẫu Java chính thức. Đây chưa phải luồng đã kiểm thử với merchant của bạn.
- Hết hạn: ghế chỉ giữ 5 phút, tính từ lần chọn đầu tiên. Tạo lượt mới trước khi thử thanh toán.
- Return URL là lượt chuyển hướng bằng trình duyệt, có thể dùng local khi chính máy đó chạy backend. IPN là VNPay gọi trực tiếp server, nên cần endpoint HTTPS công khai được cấu hình với VNPay.
- Dự án hiện mới có Return URL, chưa có IPN và đối soát giao dịch. Nếu đóng trình duyệt trước khi quay lại, hệ thống có thể không nhận được kết quả. Chưa dùng bản này cho thanh toán thật.
- Các endpoint đặt vé hiện còn nhận userId do client gửi; cần session/JWT và kiểm tra quyền ở backend trước khi triển khai công khai.

Tài liệu tích hợp chính thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

## 5. Mô tả phim dài hơn

Mở `database/08_expand_movie_descriptions.sql` trong MySQL Workbench và chạy toàn bộ. File có 18 câu UPDATE cho 18 phim trong `02_sample_data.sql`, kiểm tra cả id và title trước khi cập nhật, không đổi poster, giá vé hay lịch chiếu. Nội dung là lời giới thiệu biên soạn từ dữ liệu mẫu, không phải mô tả chính thức. Các phim thêm tay ngoài file seed, ví dụ `abc`, được giữ nguyên.

Kiểm tra sau khi chạy:

```sql
SELECT id, title, CHAR_LENGTH(description) AS description_length
FROM cinema_management.movies
ORDER BY id;
```
