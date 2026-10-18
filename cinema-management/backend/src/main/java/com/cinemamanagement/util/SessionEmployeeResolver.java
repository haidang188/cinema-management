package com.cinemamanagement.util;

import com.cinemamanagement.controller.AuthController;
import com.cinemamanagement.entity.Employee;
import com.cinemamanagement.exception.ForbiddenException;
import com.cinemamanagement.exception.UnauthorizedException;
import com.cinemamanagement.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Xác định nhân viên đang thao tác từ session đăng nhập (do AuthController tạo),
 * thay vì tin employeeId do client gửi lên.
 */
@Component
@RequiredArgsConstructor
public class SessionEmployeeResolver {

    private final EmployeeRepository employeeRepository;

    public Long requireEmployeeId(HttpServletRequest request) {
        var session = request.getSession(false);
        Object userId = session == null ? null : session.getAttribute(AuthController.SESSION_USER_ID);

        if (!(userId instanceof Long id)) {
            throw new UnauthorizedException("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }

        return employeeRepository.findByUserId(id)
                .map(Employee::getId)
                .orElseThrow(() -> new ForbiddenException("Chỉ nhân viên được bán vé tại quầy."));
    }
}
