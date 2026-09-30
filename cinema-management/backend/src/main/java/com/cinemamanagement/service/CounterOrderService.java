package com.cinemamanagement.service;

import com.cinemamanagement.entity.CounterOrder;
import com.cinemamanagement.response.CounterOrderResponse;

import java.util.List;
import java.util.Optional;

public interface CounterOrderService {

    /** Tạo đơn nháp cho 1 suất chiếu; trả về holdToken để giữ ghế theo đơn. */
    CounterOrderResponse create(Long showtimeId, Long employeeId);

    CounterOrderResponse get(String code);

    /** +2 phút, tối đa 2 lần mỗi đơn. */
    CounterOrderResponse extend(String code);

    /** Tạm gác: bắt buộc tên + SĐT, giữ ghế thêm 15 phút, quầy phục vụ khách tiếp theo. */
    CounterOrderResponse park(String code, String customerName, String customerPhone);

    /** Mở lại đơn tạm gác (ở bất kỳ quầy nào). Không cộng thêm thời gian. */
    CounterOrderResponse resume(String code);

    /** Huỷ đơn và trả ghế ngay. */
    CounterOrderResponse cancel(String code);

    /** Bật đơn đoàn / bao rạp: bỏ giới hạn ghế, hạn giữ 15 phút. */
    CounterOrderResponse enableGroup(String code);

    List<CounterOrderResponse> listParked();

    /** Dùng trong transaction bán vé. */
    Optional<CounterOrder> findActiveByOwner(String holdOwner);

    void markCompleted(CounterOrder order, Long bookingId, String customerName, String customerPhone);
}