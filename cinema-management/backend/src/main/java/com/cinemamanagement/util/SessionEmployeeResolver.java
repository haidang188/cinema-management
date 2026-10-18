package com.cinemamanagement.util;

import com.cinemamanagement.entity.Employee;
import com.cinemamanagement.exception.ForbiddenException;
import com.cinemamanagement.exception.UnauthorizedException;
import com.cinemamanagement.repository.EmployeeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Xác định nhân viên đang thao tác từ token đăng nhập (do AuthController cấp),
 * thay vì tin employeeId do client gửi lên.
 */
@Component
@RequiredArgsConstructor
public class SessionEmployeeResolver {

    private final EmployeeRepository employeeRepository;
    private final AuthTokenStore authTokenStore;

    public Long requireEmployeeId(HttpServletRequest request) {
        Long id = authTokenStore.resolveUserId(request);

        if (id == null) {
            throw new UnauthorizedException("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }

        return employeeRepository.findByUserId(id)
                .map(Employee::getId)
                .orElseThrow(() -> new ForbiddenException("Chỉ nhân viên được bán vé tại quầy."));
    }
}
