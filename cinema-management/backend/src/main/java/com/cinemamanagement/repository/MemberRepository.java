package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    Optional<Member> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "user.role"})
    @Query("""
            select m
            from Member m
            where (:status is null or m.status = :status)
              and (:keyword is null
                or m.id = :memberId
                or lower(m.fullName) like lower(concat('%', :keyword, '%'))
                or lower(m.email) like lower(concat('%', :keyword, '%'))
                or lower(m.phone) like lower(concat('%', :keyword, '%'))
                or lower(m.user.username) like lower(concat('%', :keyword, '%')))
            """)
    Page<Member> searchMembers(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("memberId") Long memberId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"user", "user.role"})
    @Query("select m from Member m where m.id = :id")
    Optional<Member> findDetailById(@Param("id") Long id);

    long countByStatus(String status);

    @Query("select coalesce(sum(m.pointBalance), 0) from Member m")
    Long sumPointBalance();
}
