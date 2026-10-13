package com.cinemamanagement.response;

import com.cinemamanagement.entity.Member;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AccountProfileResponse(
        Long userId,
        Long memberId,
        String memberCode,
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
        LocalDateTime deletionRequestedAt,
        LocalDateTime scheduledDeletionAt
) {
    public static AccountProfileResponse from(Member member) {
        return new AccountProfileResponse(
                member.getUser().getId(), member.getId(), "MB%06d".formatted(member.getId()),
                member.getFullName(), member.getEmail(), member.getPhone(), member.getDateOfBirth(),
                member.getGender(), member.getAvatar(), member.getPointBalance(), member.getMembershipLevel(),
                member.getStatus(), member.getCreatedAt(), member.getDeletionRequestedAt(),
                member.getScheduledDeletionAt()
        );
    }
}
