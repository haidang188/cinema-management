# Premiere Cinemas - Bối cảnh dự án và bàn giao

> Cập nhật: 13/10/2026  
> Mục đích: giúp thành viên hoặc một cuộc trò chuyện Codex mới tiếp tục dự án mà không phải đọc lại toàn bộ lịch sử trao đổi.

## 1. Tổng quan

Premiere Cinemas là hệ thống quản lý rạp chiếu phim gồm ba nhóm người dùng:

- `MEMBER`: xem phim, tìm kiếm/lọc phim, xem chi tiết và lịch chiếu, chọn ghế, đặt vé, thanh toán mô phỏng, xem vé điện tử và đánh giá phim.
- `EMPLOYEE`: bán vé tại quầy, giữ ghế, lập đơn và hoàn tất giao dịch tại quầy.
- `ADMIN`: quản lý phim, khuyến mãi, phòng chiếu, lịch chiếu, giá vé, nhân viên và đơn đặt vé.

Stack chính:

- Backend: Java 21, Spring Boot 4.1.1, Spring MVC, Spring Data JPA, Validation, WebSocket/STOMP, Gradle.
- Frontend: React 19, TypeScript, Vite, React Router, Axios, Bootstrap, Lucide và CSS tự viết.
- Database: MySQL, schema mặc định `cinema_management`.
- Ảnh: Cloudinary.
- Thanh toán: VietQR đang dùng theo chế độ xác nhận thủ công; VNPay Sandbox đã có code nền nhưng chưa hoàn thiện kiểm thử với merchant thật.

## 2. Cấu trúc thư mục

```text
cinema-management/
|-- backend/
|   |-- src/main/java/com/cinemamanagement/
|   |   |-- config/          CORS, WebSocket, Cloudinary, payment properties
|   |   |-- controller/      REST API
|   |   |-- entity/          JPA entity
|   |   |-- enums/           BookingStatus, PaymentStatus, SeatHoldStatus...
|   |   |-- exception/       Exception và handler tập trung
|   |   |-- repository/      Spring Data JPA
|   |   |-- request/         Request DTO và validation
|   |   |-- response/        Response DTO
|   |   |-- scheduler/       Tự hết hạn booking/ghế giữ
|   |   |-- service/         Interface nghiệp vụ
|   |   |-- service/impl/    Triển khai nghiệp vụ
|   |   `-- websocket/       Phát trạng thái ghế thời gian thực
|   |-- src/main/resources/application.properties
|   `-- src/test/resources/application.properties
|-- frontend/
|   |-- src/
|   |   |-- component/       Component theo chức năng
|   |   |-- hooks/           Auth và state dùng chung
|   |   |-- pages/           Trang phim, booking, admin...
|   |   |-- routes/          Route và shell theo role
|   |   |-- service/         Client gọi backend
|   |   |-- theme/           Dark/light theme
|   |   `-- types/           TypeScript types
|   `-- package.json
|-- database/                Schema, migration thủ công và dữ liệu mẫu
|-- docs/THANH_TOAN_LOCAL.md Hướng dẫn VietQR/VNPay chi tiết
|-- README.md                Tài liệu tổng quan cũ của dự án
`-- README_PROJECT_CONTEXT.md Tài liệu bàn giao này
```

Luồng chung:

```text
React page -> frontend service -> Spring Controller -> Service -> Repository -> MySQL
           <- JSON response   <- DTO/entity mapping            <-
```

## 3. Chức năng phim đã làm

### Trang chủ và danh sách phim

- Hiển thị danh sách phim trên trang chủ.
- Tìm kiếm phim.
- Lọc theo trạng thái, thể loại, ngày và rạp.
- Trạng thái mặc định khi mới vào là phim đang chiếu.
- Dropdown trạng thái cần có `Tất cả`, `Đang chiếu`, `Sắp chiếu`.
- Các bộ lọc dùng state nháp và chỉ áp dụng khi bấm nút `Lọc`; đổi từng lựa chọn không tự gọi lọc.
- Bộ lọc ngày dùng giao diện lịch thay vì một dải ngày đơn giản.
- Banner ưu tiên tên phim, mô tả có thể rút gọn; bấm banner phải đi tới `/movies/:movieId`.

File chính:

```text
frontend/src/component/home/HomePage.tsx
frontend/src/component/home/MovieSection.tsx
frontend/src/component/home/MovieCard.tsx
frontend/src/service/movie/movieService.ts
frontend/src/types/movie.ts
```

### Chi tiết phim

- Route: `/movies/:movieId`.
- Hiển thị poster, tên phim, thể loại, thời lượng, ngày phát hành, trailer, mô tả, đạo diễn, diễn viên và ngôn ngữ.
- Đạo diễn, diễn viên và ngôn ngữ nằm cùng một hàng; ô diễn viên có chiều rộng giới hạn và tự xuống dòng.
- Lịch chiếu chỉ hiện các ngày còn lại trong tuần hiện tại, không tràn sang tuần sau.
- Suất chiếu được nhóm theo định dạng/ngôn ngữ như phụ đề, thuyết minh; không lấy phòng chiếu làm nhóm chính.
- Giao diện đã được tinh chỉnh theo hướng bỏ viền thô, bo góc nhẹ, font thống nhất và trạng thái rỗng gọn hơn.

File chính:

```text
frontend/src/pages/movies/MovieDetailPage.tsx
frontend/src/service/showtime/showtimeService.ts
backend/src/main/java/com/cinemamanagement/controller/MovieController.java
backend/src/main/java/com/cinemamanagement/controller/ShowtimeController.java
```

API chính:

```text
GET /api/movies
GET /api/movies/now-showing
GET /api/movies/{id}
GET /api/showtimes/{showtimeId}
GET /api/showtimes
GET /api/showtimes/movie/{movieId}?date=YYYY-MM-DD
```

## 4. Đánh giá phim

Nghiệp vụ đã thống nhất:

- Chỉ tài khoản đã mua vé hợp lệ của phim mới được đánh giá.
- Mỗi tài khoản chỉ đánh giá một lần cho mỗi phim.
- Form đánh giá nằm dưới danh sách đánh giá đã có.
- Chọn điểm bằng năm biểu tượng ngôi sao, không dùng dropdown.
- Điểm tổng chỉ cần dạng nhỏ gọn `x.x/5.0`, không dùng con số quá lớn.
- Nếu chưa có dữ liệu, hiển thị `Hiện chưa có đánh giá nào`.

Backend:

```text
backend/src/main/java/com/cinemamanagement/entity/MovieReview.java
backend/src/main/java/com/cinemamanagement/controller/MovieReviewController.java
backend/src/main/java/com/cinemamanagement/repository/MovieReviewRepository.java
backend/src/main/java/com/cinemamanagement/service/MovieReviewService.java
backend/src/main/java/com/cinemamanagement/service/impl/MovieReviewServiceImpl.java
backend/src/main/java/com/cinemamanagement/request/MovieReviewRequest.java
backend/src/main/java/com/cinemamanagement/response/MovieReviewResponse.java
backend/src/main/java/com/cinemamanagement/response/MovieRatingSummaryResponse.java
backend/src/main/java/com/cinemamanagement/response/MovieReviewEligibilityResponse.java
```

Frontend:

```text
frontend/src/pages/movies/MovieDetailPage.tsx
frontend/src/service/movie/movieReviewService.ts
frontend/src/types/review.ts
```

API:

```text
GET  /api/movies/{movieId}/reviews
GET  /api/movies/{movieId}/reviews/summary
GET  /api/movies/{movieId}/reviews/eligibility?userId={userId}
POST /api/movies/{movieId}/reviews?userId={userId}
```

SQL liên quan: `database/04_create_movie_reviews.sql`.

## 5. Luồng đặt vé online

Luồng mong muốn:

```text
Chọn phim/suất -> Chọn ghế -> Xác nhận -> Thanh toán -> Hoàn tất -> Xem vé điện tử
```

Các route frontend hiện tại:

```text
/booking/showtimes/:showtimeId/seats
/booking/confirm
/booking/result/:bookingCode
/payment/vnpay-return
```

Chỉ role `MEMBER` được vào các route booking online. Người chưa đăng nhập phải chuyển về `/login`.

### Chọn ghế

- Sơ đồ ghế có trạng thái trống, đang chọn, đang được giữ và đã bán.
- Ghế được giữ tạm và đồng bộ thời gian thực bằng WebSocket/STOMP.
- Rời luồng thanh toán thì ghế vẫn giữ đến khi hết hạn; scheduler sẽ tự nhả.
- Chọn/bỏ ghế phải cập nhật tại chỗ, không reload trang và không làm toàn bộ màn hình chớp trắng.
- Phần thông tin phim/suất chiếu nằm trên sơ đồ ghế; tóm tắt đơn hàng nằm bên phải.

### Xác nhận

- Có thông tin phim, vé/ghế trên một dòng hợp lý, thông tin khách hàng và tổng đơn hàng.
- Có ô nhập mã khuyến mãi và nút `Áp dụng`.
- `Xem mã khuyến mãi` mở modal chồng lên trang, không chuyển route.
- Khuyến mãi đã được nối vào luồng booking online Sprint 4: modal tải các mã còn hiệu lực và đủ điều kiện theo tổng tiền, người dùng có thể chọn hoặc nhập mã. Backend kiểm tra lại và giữ lượt dùng khi tạo booking; booking hết hạn sẽ hoàn lượt dùng. Không thay đổi giao diện khuyến mãi/quầy của Sprint 3.

### Hoàn tất và vé điện tử

- Thanh bước phải có đủ `Chọn ghế`, `Xác nhận`, `Hoàn tất` và bước thứ ba active sau giao dịch.
- Trang kết quả hiển thị booking code, thông tin khách hàng, thanh toán, phim, ghế và vé điện tử.
- Một booking có một QR chung để nhân viên quét và truy xuất toàn bộ booking.
- Backend trả danh sách vé thuộc booking; nếu mua hai ghế thì có hai vé.
- Khi mở vé, hiển thị các vé dạng dọc, dài; nhiều vé có thể cuộn xuống.

Frontend chính:

```text
frontend/src/pages/booking/BookingSeatsPage.tsx
frontend/src/pages/booking/BookingConfirmPage.tsx
frontend/src/pages/booking/BookingResultPage.tsx
frontend/src/pages/booking/booking.css
frontend/src/service/booking/bookingService.ts
frontend/src/service/booking/bookingSocketService.ts
frontend/src/service/seatHold/seatHoldService.ts
frontend/src/types/booking.ts
```

Backend chính:

```text
backend/src/main/java/com/cinemamanagement/controller/SeatHoldController.java
backend/src/main/java/com/cinemamanagement/controller/ShowtimeSeatHoldController.java
backend/src/main/java/com/cinemamanagement/controller/OnlineBookingController.java
backend/src/main/java/com/cinemamanagement/controller/OnlinePaymentController.java
backend/src/main/java/com/cinemamanagement/service/SeatHoldService.java
backend/src/main/java/com/cinemamanagement/service/OnlineBookingService.java
backend/src/main/java/com/cinemamanagement/service/impl/SeatHoldServiceImpl.java
backend/src/main/java/com/cinemamanagement/service/impl/OnlineBookingServiceImpl.java
backend/src/main/java/com/cinemamanagement/scheduler/SeatHoldExpirationScheduler.java
backend/src/main/java/com/cinemamanagement/scheduler/BookingExpirationScheduler.java
backend/src/main/java/com/cinemamanagement/config/WebSocketConfig.java
backend/src/main/java/com/cinemamanagement/websocket/SeatStatusPublisher.java
```

API online booking:

```text
POST   /api/seat-holds
PUT    /api/seat-holds/{holdToken}
GET    /api/seat-holds/{holdToken}
DELETE /api/seat-holds/{holdToken}

POST /api/showtimes/{showtimeId}/holds
POST /api/showtimes/{showtimeId}/holds/release
GET  /api/showtimes/{showtimeId}/seat-states

POST /api/bookings/preview
POST /api/bookings
GET  /api/bookings/{bookingCode}
GET  /api/bookings/scan/{qrToken}

POST /api/payments/vietqr/{bookingCode}/confirm
GET  /api/payments/vnpay/return
```

WebSocket:

```text
Endpoint: /ws
Topic:    /topic/showtimes/{showtimeId}/seats
```

### Lỗi chớp/trắng khi chọn ghế đã xử lý

Backend từng phát hai schema khác nhau trên cùng topic:

- Schema cũ: `{ type, showtimeId, showtimeSeatIds, heldUntil }`.
- Schema mới: `{ showtimeId, seats: [{ showtimeSeatId, status }] }`.

Frontend cũ giả định luôn có `showtimeSeatIds`, gọi `.includes()` và làm React crash thành trang trắng. `frontend/src/service/booking/bookingSocketService.ts` hiện có `normalizeSeatEvents()` để hỗ trợ cả hai schema. `BookingSeatsPage` cũng phải kiểm tra mảng phòng thủ. CSS booking có `overflow-anchor: none` để giảm giật khi nội dung thay đổi.

Không được bỏ phần chuẩn hóa này trừ khi backend đã được thống nhất về đúng một schema và toàn bộ client đã chuyển theo.

## 6. Nghiệp vụ giữ ghế (cập nhật 17/10/2026)

Chính sách cũ "giữ online 5 phút, không giới hạn số ghế" cho phép một tài khoản giữ cả phòng rồi bỏ đi, nên đã thay bằng:

| Kênh | Tối đa ghế | Hạn giữ | Ghi chú |
|---|---|---|---|
| Online (thành viên) | 8 ghế/lượt | 10 phút cho cả chọn ghế và thanh toán | Mỗi thành viên chỉ giữ ở 1 suất tại một thời điểm; giữ suất mới sẽ tự nhả lượt giữ chưa tạo đơn ở suất cũ |
| Quầy - thường | 20 | 5 phút, gia hạn +2 phút x 2 | Phải tạo đơn quầy trước, bắt buộc đăng nhập nhân viên |
| Quầy - đơn đoàn | Không giới hạn | 15 phút | Nhóm lớn hơn 8 người mua tại quầy |

Chống chiếm ghế online: trong 60 phút, nếu một thành viên để hết hạn 3 lượt giữ (giữ ghế/tạo đơn mà không thanh toán) thì bị chặn giữ ghế online 30 phút kể từ lượt hết hạn gần nhất. Lượt tự huỷ và lượt đã thanh toán không bị tính.

Các con số online cấu hình trong `application.properties`:

```text
booking.seat-hold-duration-minutes=10
booking.online-max-seats=8
booking.abuse-window-minutes=60
booking.abuse-max-expired-holds=3
booking.abuse-block-minutes=30
```

Frontend `BookingSeatsPage` có hằng `ONLINE_MAX_SEATS = 8`, phải đổi cùng lúc nếu sửa `booking.online-max-seats`. Luật quầy nằm trong `HoldPolicyService`.

API `/api/showtimes/{id}/holds` (quầy) bắt buộc phiên đăng nhập nhân viên và phải có đơn quầy; trước đây API này mở, ai cũng sinh token để giữ ghế ẩn danh được.

Web chỉ cho khách hàng tự đăng ký. Tài khoản nhân viên được tạo trong database/trang quản trị; backend bỏ qua `accountType` gửi lên khi đăng ký.

`BookingType` hiện vẫn tồn tại trong code vì hệ thống có cả online và bán tại quầy. Trước đây đã có thảo luận rằng khách chỉ mua online nên không cần trường này, nhưng module quầy đã được thêm sau đó; không xóa enum/trường này khi chưa kiểm tra toàn bộ luồng quầy.

## 6b. Xếp lịch chiếu và thêm nhanh suất (cập nhật 18/10/2026)

Trang `/admin/showtimes/create`: chọn phim + phòng + ngày thì backend trả lịch trong ngày của phòng, các khoảng trống đủ cho phim và các giờ gợi ý xếp liền nhau. Admin bấm chọn nhiều giờ (hoặc "Xếp kín ngày", hoặc tự nhập giờ), bấm "Kiểm tra lịch", rồi thêm tất cả trong một lần.

Luật (cấu hình trong `application.properties`):

```text
cinema.showtime.turnaround-minutes=15   # dọn phòng giữa hai suất
cinema.showtime.open-time=08:00         # suất sớm nhất
cinema.showtime.last-start-time=23:30   # suất cuối bắt đầu muộn nhất (được kết thúc sau nửa đêm)
```

- Giờ gợi ý làm tròn lên bội số 5 phút; suất mới phải bắt đầu sau hiện tại ít nhất 5 phút.
- Không xếp trước ngày khởi chiếu của phim, phòng phải ACTIVE, có ghế và đủ giá vé cho loại ngày.
- Thêm nhanh tối đa 20 suất/lần; một giờ không hợp lệ thì không lưu giờ nào (một transaction, khóa phòng khi tạo).

API (chỉ ADMIN, theo session):

```text
GET  /api/admin/showtimes/availability?movieId=&roomId=&date=YYYY-MM-DD
POST /api/admin/showtimes/batch/preview   {movieId, roomId, startTimes[], format}
POST /api/admin/showtimes/batch           {movieId, roomId, startTimes[], format}
```

Các API cũ `POST /api/admin/showtimes` và `/preview` (một suất) vẫn giữ.

## 7. Thanh toán

### VietQR

Phương án đang dùng là QR chuyển khoản có sẵn số tiền và nội dung booking:

- QR được tạo từ Quick Link của VietQR.
- `amount` lấy từ tổng tiền backend.
- `addInfo` là mã đặt vé.
- Không cần API key cho Quick Link.
- Nút `Tôi đã thanh toán` hiện xác nhận thủ công và đánh dấu đã thanh toán.

Giới hạn quan trọng: hiển thị VietQR không tự biết tiền đã vào tài khoản. Luồng hiện tại chỉ phù hợp demo/local. Muốn tự động xác nhận thật cần webhook/API đối soát từ một đơn vị cung cấp dịch vụ giao dịch, hoặc nhân viên xác nhận thủ công ở backend.

Biến môi trường:

```powershell
$env:VIETQR_BANK_ID='MA_BIN_NGAN_HANG'
$env:VIETQR_BANK_NAME='TEN_NGAN_HANG'
$env:VIETQR_ACCOUNT_NUMBER='SO_TAI_KHOAN'
$env:VIETQR_ACCOUNT_NAME='TEN CHU TAI KHOAN KHONG DAU'
$env:VIETQR_TEMPLATE='compact2'
```

### VNPay Sandbox

Code cấu hình và tạo URL đã có nhưng người dùng quyết định tạm ưu tiên VietQR vì VNPay cần đăng ký merchant và website/return flow mất nhiều công hơn. Không coi VNPay là đã hoàn tất kiểm thử.

Biến môi trường dự kiến:

```powershell
$env:VNPAY_TMN_CODE='MA_MERCHANT'
$env:VNPAY_HASH_SECRET='CHUOI_BI_MAT'
$env:VNPAY_RETURN_URL='http://localhost:8080/api/payments/vnpay/return'
$env:VNPAY_FRONTEND_RESULT_URL='http://localhost:5173/payment/vnpay-return'
```

Chi tiết xem `docs/THANH_TOAN_LOCAL.md`. Không commit API secret, số tài khoản thật hoặc `HashSecret` lên Git.

## 8. Module bán vé tại quầy

Code hiện có các route:

```text
/counter-sale
/counter-sale/seats
/counter-sale/confirm
/counter-sale/result
```

Backend liên quan:

```text
CounterOrderController
CounterSaleController
CounterSaleShowtimeController
CustomerController
MemberController
HoldPolicyService
```

Module quầy và online cùng tác động trạng thái ghế, vì vậy mọi sửa đổi `SeatHoldServiceImpl`, WebSocket hoặc scheduler phải kiểm tra cả hai luồng.

## 9. Auth và giới hạn bảo mật hiện tại

Frontend dùng `useAuth` và lưu `cinema.currentUser` trong `localStorage`. Route booking online yêu cầu `MEMBER`; shell admin dùng role để điều hướng.

Hệ thống hiện chưa có cơ chế Spring Security + JWT/session hoàn chỉnh. Một số API vẫn nhận `userId` từ client. Đây không an toàn nếu triển khai công khai vì client có thể sửa ID. Trước production cần:

- xác thực token/session ở backend;
- lấy user hiện tại từ security context;
- kiểm tra role ở backend;
- không tin `userId`, giá tiền hay trạng thái thanh toán do frontend gửi.

## 10. Cloudinary

Cloudinary dùng cho poster phim và ảnh khuyến mãi. Các biến môi trường:

```powershell
$env:CLOUDINARY_CLOUD_NAME='cloud_name'
$env:CLOUDINARY_API_KEY='api_key'
$env:CLOUDINARY_API_SECRET='api_secret'
```

`cloud_name` và `api_key` là hai giá trị khác nhau. Phải restart backend sau khi đổi biến môi trường. Không đưa `api_secret` vào frontend hoặc commit lên Git.

## 11. Theme và định hướng giao diện

- Có nút đổi sáng/tối ở góc trên bên phải.
- Theme nằm trong `frontend/src/theme/` và được bọc ở `frontend/src/App.tsx`.
- Ưu tiên bo góc nhẹ khoảng 6-8px, nền phân cấp và shadow nhẹ thay cho nhiều khung viền cứng.
- Dùng font sans-serif thống nhất; body text `font-weight: 400`, `line-height` khoảng 1.5-1.6.
- Không dùng quá nhiều hình vuông/hộp lồng nhau.
- Nút ngày lịch chiếu cần nhỏ gọn; active bằng nền hoặc gạch nhấn, không giống bảng Excel.
- Empty state không nên trông như input.
- Thanh tỷ lệ đánh giá cao khoảng 6-8px.

File theme:

```text
frontend/src/theme/ThemeContext.tsx
frontend/src/theme/theme-context.ts
frontend/src/theme/ThemeToggle.tsx
frontend/src/theme/theme.css
```

## 12. Database và SQL

Các file hiện có:

```text
database/02_sample_data.sql
database/03_update_vietnamese_data.sql
database/04_create_movie_reviews.sql
database/05_seed_employees.sql
database/06_online_booking.sql
database/07_seed_online_booking_test_data.sql
database/08_expand_movie_descriptions.sql
database/09_complete_online_booking_setup.sql
database/rap_chieu_phim_full.sql
```

Ý nghĩa nổi bật:

- `04_create_movie_reviews.sql`: bảng/constraint/index cho đánh giá phim.
- `06_online_booking.sql`: cấu trúc booking online.
- `07_seed_online_booking_test_data.sql`: dữ liệu thử suất chiếu, phòng, ghế và booking.
- `08_expand_movie_descriptions.sql`: cập nhật mô tả dài cho phim mẫu.
- `09_complete_online_booking_setup.sql`: tổng hợp bổ sung cho luồng đặt vé online.

Lưu ý rất quan trọng: chỉ đặt file `.sql` trong thư mục `database/` không làm Spring tự chạy file. `spring.jpa.hibernate.ddl-auto=update` chỉ đồng bộ một phần schema từ entity, không chạy các seed/migration tùy ý. Muốn máy thành viên khác tự áp dụng SQL cần:

- tích hợp Flyway/Liquibase; hoặc
- cấu hình `spring.sql.init.*` và tên file phù hợp; hoặc
- hướng dẫn chạy thủ công bằng MySQL Workbench/CLI.

Không nên dựa vào `ddl-auto=update` cho migration production.

## 13. Cấu hình local

Backend hiện đọc MySQL từ `backend/src/main/resources/application.properties`. Không đưa mật khẩu cá nhân vào tài liệu hoặc commit. Nên chuyển username/password sang biến môi trường.

Frontend dùng biến:

```env
VITE_API_URL=http://localhost:8080/api
```

Lưu ý `localhost` và `127.0.0.1` có localStorage khác nhau. Nên dùng thống nhất `http://localhost:5173` trong toàn bộ luồng.

## 14. Cách chạy

### Backend

```powershell
cd backend
.\gradlew.bat bootRun
```

Backend mặc định: `http://localhost:8080`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend mặc định: `http://localhost:5173`.

### Kiểm tra

```powershell
# Backend
cd backend
.\gradlew.bat test

# Frontend
cd frontend
npm run build
npm run lint
```

Các warning lint có sẵn cần phân biệt với lỗi mới. Vite có thể cảnh báo bundle lớn hơn 500 kB nhưng warning này không làm build thất bại.

## 15. Điểm cần kiểm tra khi tiếp tục

1. Chính sách giữ ghế đã chốt ở mục 6 (online 10 phút, tối đa 8 ghế, chặn khi để hết hạn nhiều lần); nếu đổi số phải đổi cả backend lẫn `ONLINE_MAX_SEATS` ở frontend.
2. Kiểm tra toàn bộ luồng chọn ghế sau mỗi lần pull/merge; đặc biệt không làm mất `normalizeSeatEvents()`.
3. Test đồng thời hai trình duyệt chọn cùng ghế để xác nhận khóa DB, WebSocket và nhả ghế.
4. Test hết hạn khi đang ở trang ghế và trang xác nhận.
5. Test một booking nhiều ghế: tạo đủ ticket, QR booking quét ra đủ danh sách vé và modal cuộn đúng.
6. Không tự xác nhận VietQR trong môi trường thật nếu chưa có đối soát/webhook.
7. Nâng cấp auth backend trước khi deploy công khai.
8. Tích hợp migration tool nếu muốn SQL tự chạy trên máy thành viên khác.
9. Kiểm tra responsive cho trang chi tiết phim, sơ đồ ghế, xác nhận và vé điện tử.

## 16. Git và merge

Quy trình an toàn khi đưa feature vào `develop`:

```powershell
git fetch origin
git switch develop
git pull --rebase origin develop
git merge feature/Ly/sprint2

# Nếu conflict: sửa file, rồi
git add <cac-file-da-sua>
git commit
git push origin develop
```

Không dùng `git push --force` lên nhánh chung nếu chưa thống nhất với team. Khi remote feature đi trước, ưu tiên fetch/rebase hoặc pull/rebase rồi mới push.

Trong workspace hiện tại, lệnh Git từ thư mục dự án đang báo lỗi không tìm/chuyển được Git worktree; thư mục hiện tại không chứa `.git` trực tiếp. Trước khi commit tài liệu này cần kiểm tra lại vị trí clone hoặc metadata Git ở thư mục cha.

## 17. Prompt khởi động cho cuộc trò chuyện mới

Có thể dùng nội dung sau:

```text
Hãy đọc README_PROJECT_CONTEXT.md, README.md và docs/THANH_TOAN_LOCAL.md trước.
Sau đó kiểm tra code hiện tại, không giả định tài liệu luôn đúng sau các lần pull/merge.
Dự án là Spring Boot + React/Vite + MySQL. Chức năng đang tập trung là đặt vé online,
giữ ghế thời gian thực, VietQR, vé điện tử và đánh giá phim.
Chính sách giữ ghế đã chốt ở mục 6 (cấu hình booking.* trong application.properties).
Backend hiện chỉ phát một schema WebSocket ({showtimeId, seats[]}) sau khi commit;
normalizeSeatEvents ở frontend vẫn hỗ trợ cả schema cũ, giữ lại để an toàn.
```

## 18. Nguyên tắc khi sửa tiếp

- Đọc code hiện tại sau mỗi lần pull; không dựa hoàn toàn vào lịch sử trò chuyện.
- Không ghi đè hoặc hoàn tác thay đổi của thành viên khác nếu chưa hiểu nguồn gốc.
- Giữ thay đổi đúng phạm vi chức năng.
- Backend là nguồn quyết định cuối cho giá, quyền đánh giá, trạng thái ghế và thanh toán.
- Sau sửa phải chạy build/test phù hợp và kiểm tra trực tiếp luồng người dùng.
- Không commit secret, tài khoản ngân hàng, Cloudinary secret hoặc VNPay HashSecret.

## 19. Tài khoản thành viên và điểm tích lũy

Đã bổ sung trong ngày 13/10/2026:

- Trang thành viên `/account` cho phép xem và cập nhật họ tên, email, số điện thoại, ngày sinh, giới tính và avatar.
- Email hồ sơ và `users.username` được cập nhật đồng bộ.
- Điểm chỉ dùng để xét hạng, không quy đổi trực tiếp thành tiền và không hết hạn.
- Mỗi `10.000đ` thực trả được `1 điểm`, làm tròn xuống; chỉ cộng khi booking đã xác nhận và thanh toán thành công.
- Hạng: `BASIC` 0-99, `SILVER` 100-299, `GOLD` 300-599, `PLATINUM` từ 600 điểm.
- Cộng điểm áp dụng cho booking online và bán vé tại quầy. Quầy chỉ cộng khi số điện thoại khớp một member `ACTIVE`.
- `point_histories.idempotency_key` và unique `(booking_id, type)` ngăn cộng điểm lặp.
- Thành viên có thể yêu cầu xóa bằng mật khẩu hiện tại. Tài khoản chuyển sang `PENDING_DELETION` trong 30 ngày và bị giới hạn ở màn hình khôi phục.
- Người dùng có thể khôi phục trong thời gian chờ. Scheduler chạy hàng giờ để chuyển tài khoản quá hạn sang `DELETED` và ẩn danh dữ liệu cá nhân; booking, vé, thanh toán, đánh giá và lịch sử điểm được giữ lại.

API thành viên:

```text
GET  /api/account/{userId}
PUT  /api/account/{userId}
POST /api/account/{userId}/deletion
POST /api/account/{userId}/restore
GET  /api/account/{userId}/points
GET  /api/account/{userId}/points/history
```

Migration: `database/10_member_loyalty_and_account_deletion.sql`.

Lưu ý bảo mật cũ vẫn còn: API hiện nhận `userId` từ client vì dự án chưa có Spring Security/JWT hoàn chỉnh. Trước production phải thay bằng người dùng lấy từ security context.
