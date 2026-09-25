package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Employee;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    boolean existsByEmail(String email);

    boolean existsByEmployeeCodeIgnoreCase(String employeeCode);

    boolean existsByEmployeeCodeIgnoreCaseAndIdNot(String employeeCode, Long id);

    Optional<Employee> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "user.role"})
    @Query("""
            select e
            from Employee e
            where (:status is null or e.status = :status)
              and (:keyword is null
                or lower(e.employeeCode) like lower(concat('%', :keyword, '%'))
                or lower(e.fullName) like lower(concat('%', :keyword, '%'))
                or lower(e.email) like lower(concat('%', :keyword, '%'))
                or lower(e.phone) like lower(concat('%', :keyword, '%'))
                or lower(e.position) like lower(concat('%', :keyword, '%')))
            """)
    Page<Employee> searchEmployees(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "user.role"})
    @Query("select e from Employee e where e.id = :id")
    Optional<Employee> findDetailById(@Param("id") Long id);
}
