# Báo cáo UI/UX QA – Hưng SP1–SP4

Ngày kiểm tra: **17/10/2026**, múi giờ Asia/Bangkok.

**Kết luận: PARTIAL – chưa xác nhận UI PASS toàn diện.** Đã sửa các lỗi xác định được, 40/40 test DOM/API giả lập đạt, frontend build và TypeScript đạt. Chưa có trình duyệt kết nối nên chưa kiểm tra thị giác, screenshot, layout responsive hoặc E2E lưu/reload với backend thật. Test DOM không phải kiểm tra trình duyệt và không có bộ máy layout.

## 1. Môi trường và phương pháp

- Kiểm tra theo thứ tự SP1 → SP2 → SP3 → SP4, sau đó regression các đường dẫn Admin.
- Đã đọc và thử kết nối Browser theo skill; công cụ trả `No browser is available`, danh sách browser trả `[]`. Không mở trang bằng trình duyệt trong lượt QA này.
- Frontend Vite chạy được tại `http://127.0.0.1:5173/`; backend Spring Boot chạy được tại `http://localhost:8080`.
- Backend chạy với `--spring.jpa.hibernate.ddl-auto=none`; không sửa cấu hình/schema hay chạy migration/SQL.
- Đăng nhập tài khoản Admin mặc định của dự án qua API: HTTP 200, role ADMIN. Đây là kiểm tra API, không phải đăng nhập qua giao diện.
- Chỉ gửi GET để đọc danh sách, chi tiết, kết quả tìm kiếm, thể loại và thống kê trên backend hiện tại. POST/PUT/DELETE nghiệp vụ trong test được giả lập hoàn toàn bằng fetch/axios; không tạo/sửa/xóa bản ghi thật.
- Backend có initializer và tác vụ nền sẵn trong ứng dụng. Chưa thể khẳng định database này là môi trường test riêng. Không thực hiện E2E ghi dữ liệu vì vậy.
- Giữ nguyên thay đổi có sẵn ở `cinema-management/README.md` và tệp SQL chưa được theo dõi. Không commit, push hoặc merge.

## 2. Danh sách trang đã kiểm tra

Các trang dưới đây được mount thật bằng React trong **JSDOM**, có router và AdminShell, dùng API giả lập. Test kiểm tra trang khởi tạo, có nội dung và không rơi vào trang lỗi runtime; không đánh giá bố cục bằng mắt.

| Sprint/phạm vi | Đường dẫn | Mức kiểm tra |
| --- | --- | --- |
| SP1 | `/admin`, `/admin/movies` | Mount, loading, rỗng, tìm kiếm, lọc, offline; xác nhận xóa và API từ chối |
| SP1 | `/admin/movies/create`, `/admin/movies/:movieId/edit` | Mount; MovieForm validation, focus lỗi đầu, poster lỗi, submit lặp, pending, lỗi lưu |
| SP2 | `/admin/cinema-rooms` | Mount, loading, rỗng, tìm kiếm, lọc, offline; xác nhận xóa và API từ chối |
| SP2 | `/admin/cinema-rooms/create`, `/admin/cinema-rooms/:roomId/edit` | Mount; vẽ ghế bằng click bàn phím, bốn trạng thái, xác nhận xóa, 20×30 ô, payload tọa độ, submit lặp |
| SP2 | `/admin/cinema-rooms/:roomId` | Mount chi tiết với ghế mẫu; chưa thực hiện đầy đủ luồng thay đổi loại ghế/lưu/rời trang |
| SP3 | `/admin/employees` | Mount, loading, rỗng, tìm kiếm, lọc, offline; validation tạo, sửa thành công, pending, submit lặp, toast, ngừng hoạt động bị từ chối |
| SP4 | `/admin/members` | Mount, loading, rỗng, tìm kiếm, lọc, offline; validation sửa, lỗi trùng email trong modal, pending, submit lặp, cập nhật thành công và refresh |
| Regression Admin | `/admin/promotions`, `/admin/promotions/create`, `/admin/promotions/:id`, `/showtimes`, `/ticket-prices` | Smoke test khởi tạo trong shell với dữ liệu giả lập; chưa test toàn bộ nghiệp vụ các module này |

Tổng cộng **15 đường dẫn** được kiểm tra khởi tạo trong shell.

API thật: danh sách, một chi tiết và tìm kiếm không có kết quả của cả bốn module đều trả **200**; API thể loại và thống kê thành viên trả **200**. Lúc kiểm tra có 18 phim, 5 phòng, 10 nhân viên, 1 thành viên. Bằng chứng: [api-read-checks.json](cinema-management/docs/qa-hung-sp1-sp4/api-read-checks.json). Không lưu dữ liệu cá nhân trong bằng chứng.

## 3. Modal/dialog

| Modal | Kết quả và giới hạn |
| --- | --- |
| AppModal chung | Test đạt: focus vào modal, vòng Tab/Shift+Tab, chặn focus ra ngoài, trả focus khi đóng, khóa/khôi phục cuộn body, tên dialog qua aria-labelledby |
| AppModal đang xử lý | Test đạt: busy khóa nút đóng, Escape và click overlay |
| Xác nhận bỏ thay đổi lồng nhau | Test đạt trên AppModal: Escape chỉ đóng modal trên cùng, giữ khóa cuộn; form nhân viên giữ dữ liệu khi chọn tiếp tục chỉnh sửa |
| Xóa phim | Test mở xác nhận, chỉ gọi DELETE sau xác nhận; lỗi API hiện trong dialog |
| Thành công thêm/sửa phim | Rà soát code dùng AppModal và chỉ mở sau khi API resolve; chưa thao tác luồng thành công này trong trình duyệt |
| Xóa phòng | Test xác nhận và lỗi API trong dialog |
| Xóa toàn bộ ghế | Test mở xác nhận trước khi xóa; sơ đồ chưa bị xóa khi mới mở dialog |
| Giảm kích thước sơ đồ | Rà soát điều kiện ghế ngoài phạm vi và AppModal; chưa test riêng nhánh xác nhận giảm kích thước |
| Thành công tạo/sửa phòng | Rà soát code; chưa test trọn luồng thành công |
| Rời chi tiết phòng khi có thay đổi | Rà soát code; chưa test tương tác nhánh này |
| Thêm/sửa nhân viên | Test validation, cảnh báo bỏ thay đổi, khóa đóng khi lưu, chặn submit lặp, đóng sau cập nhật thành công |
| Chi tiết nhân viên | Test đóng lúc đang tải; phản hồi muộn không mở lại modal |
| Ngừng hoạt động nhân viên | Test yêu cầu xác nhận và hiển thị lỗi API trong modal |
| Chi tiết thành viên đang tải | Test đóng lúc chờ API và bỏ qua phản hồi muộn |
| Chi tiết thành viên đã tải | Rà soát component; chưa kiểm tra đầy đủ mọi trường hiển thị bằng tương tác |
| Chỉnh sửa thành viên | Test validation, lỗi trùng email trong modal, khóa đóng khi lưu, chặn submit lặp, cập nhật thành công và refresh danh sách |

Đã sửa CSS để AppModal có `height: auto`, loại class backdrop Bootstrap khỏi overlay, bảo toàn các cỡ sm/md/lg/xl, giữ body cuộn độc lập và bổ sung thanh hành động sticky cho form nhân viên. **Vị trí chính giữa, clipping, footer và z-index chưa được quan sát bằng trình duyệt.**

## 4. Toast, alert và confirm

- **Phim:** validation gần trường và alert lỗi lưu có test; modal thành công thêm/sửa đã rà soát code, chưa xác nhận hiển thị thực tế. Lỗi xóa nay hiện ngay trong dialog.
- **Phòng:** lỗi form có role alert; xác nhận xóa phòng và xóa sơ đồ có test. Toast lưu loại ghế trong chi tiết có `role=status`/`aria-live=polite` trong code; chưa thao tác phát toast này.
- **Nhân viên:** test cập nhật thành công đóng modal, tải lại danh sách, tạo toast `role=status`; lỗi submit và lỗi ngừng hoạt động nằm trong modal. Chưa test riêng thông báo tạo nhân viên thành công.
- **Thành viên:** test cập nhật thành công qua live region; lỗi trùng email nằm trong modal và có field error; không hiển thị success khi PUT trả 409.
- **API chung:** test 400/401/403/404/409/500, response HTML, JSON không hợp lệ, mất mạng và 204. Lỗi 5xx dùng thông báo tiếng Việt chung; lọc exception/SQL/HTML khỏi message và fieldErrors.
- Room/employee toast được nâng z-index lên 11000, giới hạn chiều rộng và cho phép ngắt chuỗi dài. Chưa xác nhận lớp hiển thị trên trình duyệt.
- Thời gian toast phòng/nhân viên hiện là 2,6 giây theo code sẵn; chưa đánh giá khả năng đọc thực tế. Alert thành công thành viên hiện tồn tại đến cập nhật tiếp theo; chưa có nút đóng hoặc timeout.
- Các notification đang dùng một state message, không tạo hàng đợi toast mới. Chưa kiểm tra việc đọc thông báo bằng screen reader thật.

## 5. Lỗi phát hiện và xử lý

| ID | Lỗi/bằng chứng | Xử lý | Xác minh |
| --- | --- | --- | --- |
| QA01 | AppModal không chuyển/giữ/trả focus; chỉ xử lý Escape và scroll lock | Thêm focus lifecycle, vòng Tab, stack modal để chỉ dialog trên cùng xử lý | Test DOM đạt |
| QA02 | Modal kế thừa `height:100%` của Bootstrap và dùng chung class backdrop | Đặt height auto, bỏ class backdrop xung đột, scope theo app-modal | Build đạt; cần visual QA |
| QA03 | Member submit không có chốt đồng bộ; nút X/Escape vẫn đóng lúc PUT pending | Ref chống lặp, busy chặn đóng, xác nhận bỏ sửa khi hủy | Test DOM đạt |
| QA04 | Lỗi lưu member chỉ xuất hiện trên trang phía sau overlay | Thêm editError trong body modal, giữ fieldErrors | Test lỗi 409 đạt |
| QA05 | Đóng chi tiết member/employee lúc tải không vô hiệu hóa phản hồi cũ | Request sequence kiểm tra trước khi set state | Test API chậm đạt |
| QA06 | Header X/Escape ở form employee có thể bỏ dữ liệu, kể cả khi đang lưu | Đồng bộ busy/dirty từ form, cảnh báo bỏ thay đổi, khóa đóng khi lưu | Test DOM đạt |
| QA07 | Một số form và hành động xóa chỉ dựa vào React state để chặn submit; room form thiếu guard | Thêm chốt ref cho MovieForm, room form/detail save, employee modal/deactivate, member và xóa phim/phòng | Test submit và xác nhận xóa liên tục đạt; nhánh detail save mới kiểm tra type/build |
| QA08 | Designer ghế chỉ xử lý pointer; pointer capture trên ô cản pointerenter ở ô kế tiếp | Bổ sung click bàn phím, nhãn loại/trạng thái; bỏ capture cố định, xử lý pointercancel | Click bàn phím và payload 600 ô đạt; kéo chuột/chạm chưa test thật |
| QA09 | HTTP client JSON.parse trực tiếp, dùng raw message backend và lỗi không dấu | Phân tích phản hồi có bảo vệ, thông báo theo status, lọc lỗi kỹ thuật, thông báo mất kết nối | Test HTTP đạt |
| QA10 | Poster preview hỏng không có trạng thái thay thế; trailer chỉ kiểm tra độ dài | Fallback ảnh lỗi, reset khi đổi URL, kiểm tra HTTP/HTTPS; bỏ validation trùng | Test fallback đạt; chưa tải Cloudinary thật |
| QA11 | Toolbar trung bình có min-width lớn so với vùng còn lại cạnh sidebar | Hai cột minmax(0,1fr) ở ≤1023px; min-width:0 cho vùng nội dung và panel ghế | Rà soát CSS/build; chưa đo layout |
| QA12 | Nhãn lọc dùng display:none nên mất khỏi accessibility tree | Giữ nhãn bằng kỹ thuật visually hidden | Rà soát CSS; chưa chạy accessibility tree browser |
| QA13 | Employee toast z-index 80 thấp hơn modal 9999 | Nâng lên 11000 và giới hạn chiều rộng | Rà soát cascade; chưa visual QA |
| QA14 | Thông báo lỗi xóa phim/phòng/ngừng nhân viên nằm sau dialog | Render lỗi ngay trong dialog xác nhận | Test API 409 cho cả ba đạt |
| QA15 | Danh sách phòng rỗng luôn gợi ý đổi bộ lọc dù chưa lọc | Tách empty state chưa có dữ liệu và không có kết quả tìm kiếm | Test empty đạt |
| QA16 | TypeScript báo trùng Employee.userId bắt buộc/tùy chọn, thiếu CSS module declaration và env API_BASE_URL | Bỏ block interface lặp, thêm declaration CSS và env tùy chọn | tsc --noEmit đạt |

Các rủi ro CSS trong bảng được phân biệt với lỗi đã có bằng chứng hành vi. Không kết luận giao diện đẹp hoặc hết tràn chỉ từ sửa CSS.

## 6. Ảnh trước/sau

**Không có screenshot trước hoặc sau.** Không có browser kết nối, không tạo ảnh giả hay dùng DOM snapshot thay ảnh màn hình. So sánh trước/sau hiện dựa trên diff code và test hành vi sau sửa, không phải so sánh hình ảnh.

## 7. Các file đã sửa/thêm

Đường dẫn dưới đây tính từ `cinema-management/frontend/`:

- `src/component/common/AppModal.tsx`: focus, modal stack, busy, confirm bỏ thay đổi, nhãn đóng tiếng Việt.
- `src/component/movie/MovieForm.tsx`: chốt submit, disabled cancel, poster fallback, validation trailer, aria cho các trường bắt buộc.
- `src/pages/admin/movies/MovieList.tsx`: busy và lỗi xóa trong dialog.
- `src/pages/admin/rooms/CinemaRoomForm.tsx`: bàn phím, pointer, nhãn ghế, kích thước nguyên, chốt submit, alert.
- `src/pages/admin/rooms/CinemaRoomDetail.tsx`: chốt đồng bộ chống lưu ghế lặp.
- `src/pages/admin/rooms/CinemaRoomList.tsx`: empty state, live alert, busy và lỗi xóa trong dialog.
- `src/pages/admin/employees/EmployeeList.tsx`: busy/dirty, chốt submit, bỏ phản hồi cũ, lỗi trong dialog.
- `src/pages/admin/members/MemberList.tsx`: chốt submit, busy/dirty, lỗi trong modal, live region, bỏ phản hồi cũ.
- `src/service/httpClient.ts`: thông báo API an toàn và phản hồi không phải JSON.
- `src/styles/admin-components.css`: toolbar trung bình, min-width, vùng cuộn ghế, nhãn visually hidden.
- `src/styles/modal.css`: tách Bootstrap, size, focus-visible, footer employee sticky, lớp toast; bỏ !important ở nút danger.
- `src/styles/member-management.css`: áp dụng alert cả bên trong portal modal.
- `src/types/admin.ts`, `src/vite-env.d.ts`, `src/assets.d.ts`: sửa lỗi typecheck.
- `package.json`, `package-lock.json`: lệnh `test:qa` và jsdom dev dependency.
- `tests/admin-ui.test.mjs`: 40 test DOM/HTTP/regression.

Ngoài frontend: báo cáo này và `cinema-management/docs/qa-hung-sp1-sp4/api-read-checks.json`.

## 8. Responsive

| Viewport | Kết quả |
| --- | --- |
| 375×812 | **Chưa kiểm tra trực tiếp** |
| 768×1024 | **Chưa kiểm tra trực tiếp** |
| 1024×768 | **Chưa kiểm tra trực tiếp** |
| 1440×900 | **Chưa kiểm tra trực tiếp** |

Đã rà soát breakpoint, bảng có vùng overflow riêng, modal max-height theo viewport, sơ đồ 600 ô giữ grid tọa độ. Chưa xác nhận: body không cuộn ngang, nút không bị che, modal không tràn, sidebar/header/dropdown không đè nhau, vùng cuộn ghế thực sự truy cập được ở từng kích thước. Không đánh dấu responsive PASS.

## 9. Accessibility

**Đã có bằng chứng test DOM:** focus vào dialog; Tab/Shift+Tab vòng trong; kéo focus từ ngoài vào lại; focus trả trigger; Escape chỉ tác động modal trên; khóa body scroll; liên kết tiêu đề dialog; ghế thao tác bằng bàn phím; live region của thông báo cập nhật; lỗi movie bắt buộc gắn aria-invalid/aria-describedby.

**Rà soát code:** nhãn icon thao tác, nhãn tiếng Việt, focus-visible, nhãn lọc visually hidden, ghế có nhãn loại/trạng thái thay vì chỉ dùng màu.

**Chưa xác nhận:** contrast đo bằng trình duyệt, toàn bộ tab order ở layout thật, screen reader NVDA/VoiceOver, zoom, touch target, toàn bộ lỗi field có aria-describedby (đặc biệt form employee/member), focus với mọi trường ẩn/disabled trong tất cả module. Không coi việc có role=status/alert là bằng chứng screen reader đã phát âm.

## 10. Chưa thể kiểm tra / tồn tại

1. Browser E2E, screenshot trước/sau, responsive bốn kích thước, kiểm tra console/network từ trình duyệt.
2. Lưu thật, reload và kiểm tra bền vững dữ liệu. Cần database test riêng; các test mock chỉ xác nhận request/React state, không xác nhận persistence.
3. Tải ảnh Cloudinary thật/upload lỗi: các form hiện nhập URL; không có thao tác upload file để kiểm tra ở các form này. Chưa kiểm tra URL host bất thường trên backend.
4. Chuột kéo ghế, cảm ứng, xác nhận giảm kích thước, đổi ghế trong chi tiết, cảnh báo rời trang trong trình duyệt.
5. Các success dialog SP1/SP2, tạo nhân viên thành công, mọi badge hạng/điểm với dữ liệu dài/thiếu ảnh ở layout thật.
6. Backend nền báo schema hiện tại không khớp entity: `bookings.customer_id`, `showtime_seats.hold_owner`. Giữ nguyên schema theo yêu cầu. Các GET SP1–SP4 vẫn trả 200, nhưng chưa thể coi toàn bộ backend ổn định.
7. Header/side navigation của các module ngoài SP1–SP4 chỉ có smoke test khởi tạo; chưa làm functional regression đầy đủ các module đó.
8. Chưa có bằng chứng đánh giá thẩm mỹ/font tiếng Việt thực tế. Chuỗi tiếng Việt được sử dụng trong test, nhưng JSDOM không render font.
9. Form trang độc lập `EmployeeFormPage.tsx` hiện không nằm trong adminRoutes; lượt này tập trung form modal đang được dùng.

## 11. Build và test

Chạy từ `cinema-management/frontend/`:

```text
npm run test:qa       40 passed, 0 failed
npm run build         PASS – 2050 modules; có cảnh báo chunk JS >500 kB
npx tsc --noEmit      PASS
npm run lint          Exit 0, 42 cảnh báo React/Fast Refresh trong codebase
```

Lần thử backend offline ban đầu thiếu dependency cache; chạy có tải dependency sau đó khởi động thành công với ddl-auto=none. Đây không phải backend integration-test suite. Không chạy test cấu hình create-drop vào database thật.

40 test gồm 2 test modal chung, 2 SP1 form, 2 SP2 form/ghế, 2 SP3 modal, 2 SP4 modal, 7 HTTP, 15 route smoke, 4 trạng thái danh sách, 3 destructive confirm và 1 SP3 pending/success. Tổng hợp theo nhóm này có thể giao nhau về chức năng nhưng mỗi dòng test chỉ được đếm một lần.

## 12. Đánh giá từng Sprint và điểm tham khảo

| Sprint | Đánh giá có bằng chứng | Trạng thái |
| --- | --- | --- |
| SP1 | Validation/focus, submit lặp, lỗi ảnh/lưu/xóa và trạng thái danh sách được test; các trang mount được | Test hành vi đã nêu PASS; **UI toàn diện chưa xác nhận** |
| SP2 | Designer bàn phím, bốn loại ô, payload 600 ghế và trạng thái danh sách được test | Test hành vi đã nêu PASS; **visual/drag/detail save chưa xác nhận** |
| SP3 | Form modal, dirty cancel, pending, sửa thành công/toast, lỗi deactivate và phản hồi muộn được test | Test hành vi đã nêu PASS; **UI toàn diện chưa xác nhận** |
| SP4 | Validation, duplicate error trong modal, pending, sửa thành công/refresh và phản hồi muộn được test | Test hành vi đã nêu PASS; **persistence/visual chưa xác nhận** |

Để tránh tự chấm tùy ý, **chưa gán điểm chất lượng 1–10** khi thiếu bằng chứng render. Tiêu chí dùng cho lần kiểm tra trực tiếp tiếp theo:

| Hạng mục | Điểm hiện tại | Tiêu chí để chấm 1–10 và bằng chứng cần có |
| --- | --- | --- |
| Visual design | Chưa đủ bằng chứng | Mỗi nhóm 2 điểm: typography/dấu Việt, contrast, căn lề/khoảng cách, phân cấp, trạng thái ảnh/bảng; cần screenshot và đo contrast |
| Consistency | Chưa đủ bằng chứng | Mỗi nhóm 2 điểm: màu/token, input/button, bảng/badge, modal, thông báo; code đã dùng shared AppModal nhưng cần so ảnh bốn module |
| Usability | Chưa đủ bằng chứng | Mỗi nhóm 2 điểm: tìm/lọc, xem/sửa, validation, pending/error recovery, lưu/reload; test DOM cung cấp bằng chứng một phần, persistence chưa test |
| Responsive | Chưa đủ bằng chứng | Bốn viewport mỗi viewport 2 điểm khi không overlap/che/cắt/body overflow; 2 điểm còn lại cho table/seat scroll và nút hành động; hiện chưa có phép đo layout |
| Accessibility | Chưa đủ bằng chứng | Năm nhóm mỗi nhóm 2 điểm: keyboard/focus, semantics/labels, errors/live announcements, contrast, zoom/screen reader; có test nhóm đầu và một phần semantics, chưa đủ tổng điểm |

Không thay điểm chưa đo bằng điểm 0 hoặc điểm ước lượng. Không dùng 40/40 test làm điểm thẩm mỹ hay kết luận toàn bộ UI PASS.

## Bổ sung sau ảnh báo lỗi lưu phòng

Đã tái hiện một nguyên nhân của thông báo HTTP 409 bằng test database H2 tách biệt: thêm ghế vào trước ghế đang có làm frontend đánh lại số; backend chèn ghế mới trước khi giải phóng số cũ, vi phạm unique `(room_id, row_label, seat_number)`. Hai test thêm/đánh lại số đều thất bại trước sửa với DataIntegrityViolationException. Ảnh người dùng chỉ có thông báo chung, chưa đủ chứng minh lần thao tác cụ thể cũng thuộc nhánh này.

Đã sửa `backend/src/main/java/com/cinemamanagement/service/impl/CinemaRoomServiceImpl.java`: chuyển các ghế cần đánh lại số sang số tạm không trùng trong cùng transaction, flush, rồi lưu số cuối. Giữ nguyên ID ghế và các tham chiếu; không sửa schema MySQL. Thêm `backend/src/test/java/com/cinemamanagement/CinemaRoomLayoutTests.java`.

Kết quả: **4/4 test H2 đạt**, gồm chèn trước ghế cũ, đánh lại nhiều số, xóa ghế đầu và đánh lại số, cập nhật loại ghế mà giữ ID. Gradle build test thành công. Không chạy PUT vào database thật hoặc xác nhận qua trình duyệt. Cần khởi động lại backend đang chạy để nạp bản sửa.

## Bổ sung kiểm tra riêng công cụ “Khoảng trống”

Đã kiểm tra luồng frontend: ô chọn Khoảng trống được bỏ khỏi payload `seats`; backend hiểu đó là xóa bản ghi ghế. Nếu ghế đang có bản ghi trong `showtime_seats`, ràng buộc khóa ngoại chặn DELETE ngay cả khi trạng thái ghế suất chiếu là AVAILABLE. Backend trước đây chỉ kiểm tra `booking_seats`, nên nhánh này trả thông báo trùng/không hợp lệ chung.

Đã tái hiện trên H2: test ghế AVAILABLE có suất chiếu thất bại trước sửa với DataIntegrityViolationException do khóa ngoại `SHOWTIME_SEATS.SEAT_ID -> SEATS.ID`. Sau sửa, service kiểm tra liên kết suất chiếu trước khi xóa và trả ConflictException với tên ghế, nguyên nhân tiếng Việt, hướng dẫn giữ ghế hoặc chọn Ghế ngừng hoạt động. Không xóa dây chuyền suất chiếu/vé và không thay đổi schema. Ghế không có liên kết vẫn được xóa để tạo khoảng trống như trước.

File bổ sung sửa: `backend/.../repository/ShowtimeSeatRepository.java`, `backend/.../service/impl/CinemaRoomServiceImpl.java`, `backend/src/test/java/com/cinemamanagement/CinemaRoomLayoutTests.java`, `frontend/src/pages/admin/rooms/CinemaRoomForm.tsx`, `frontend/tests/admin-ui.test.mjs`. Frontend có giải thích Khoảng trống là xóa ghế khi lưu.

Kết quả mới nhất: **5/5 backend H2 test đạt**, **41/41 frontend test đạt**, build frontend và TypeScript đạt. Test frontend kiểm tra bỏ đúng ghế giữa hàng, giữ tọa độ các ô còn lại, hiển thị lỗi và giữ bản chỉnh sửa khi lưu bị từ chối. Test backend xác nhận ghế và liên kết suất chiếu không bị xóa khi trả conflict. Chưa tái hiện bằng browser hoặc gửi thao tác ghi lên database thật của người dùng.
