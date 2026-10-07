package com.cinemamanagement.response;

import com.cinemamanagement.entity.Member;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record MemberResponse(
        Long id,
        Long userId,
        String memberCode,
        String username,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String avatar,
        Integer pointBalance,
        String membershipLevel,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static MemberResponse fromEntity(Member member) {
        return new MemberResponse(
                member.getId(),
                member.getUser().getId(),
                formatMemberCode(member.getId()),
                member.getUser().getUsername(),
                member.getFullName(),
                member.getEmail(),
                member.getPhone(),
                member.getDateOfBirth(),
                member.getGender(),
                member.getAvatar(),
                member.getPointBalance(),
                member.getMembershipLevel(),
                member.getStatus(),
                member.getCreatedAt(),
                member.getUpdatedAt()
        );
    }

    private static String formatMemberCode(Long id) {
        return id == null ? null : String.format("MB%06d", id);
    }
}
