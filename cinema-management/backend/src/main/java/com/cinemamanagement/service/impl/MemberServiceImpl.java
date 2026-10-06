package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Member;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.request.UpdateMemberRequest;
import com.cinemamanagement.response.MemberResponse;
import com.cinemamanagement.response.MemberStatisticsResponse;
import com.cinemamanagement.service.MemberService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
public class MemberServiceImpl implements MemberService {
    private static final Set<String> ALLOWED_GENDERS = Set.of("MALE", "FEMALE", "OTHER");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final MemberRepository memberRepository;

    public MemberServiceImpl(MemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MemberResponse> getMembers(String keyword, String status, Pageable pageable) {
        String normalizedKeyword = normalize(keyword);
        return memberRepository.searchMembers(normalizedKeyword, normalizeStatusFilter(status), parseMemberCode(normalizedKeyword), pageable)
                .map(MemberResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberResponse getMember(Long id) {
        return MemberResponse.fromEntity(findMember(id));
    }

    @Override
    @Transactional(readOnly = true)
    public MemberStatisticsResponse getStatistics() {
        return new MemberStatisticsResponse(
                memberRepository.count(),
                memberRepository.countByStatus("ACTIVE"),
                memberRepository.countByStatus("INACTIVE"),
                memberRepository.sumPointBalance()
        );
    }

    @Override
    @Transactional
    public MemberResponse updateMember(Long id, UpdateMemberRequest request) {
        Member member = findMember(id);
        String email = nullableTrim(request.getEmail());
        String phone = nullableTrim(request.getPhone());

        if (email != null && memberRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("Email da duoc su dung.");
        }

        applyMemberFields(member, request.getFullName(), email, phone, request.getDateOfBirth(),
                request.getGender(), request.getAvatar(), request.getStatus());
        member.setUpdatedAt(LocalDateTime.now());

        return MemberResponse.fromEntity(memberRepository.save(member));
    }

    private Member findMember(Long id) {
        return memberRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay thanh vien voi id " + id));
    }

    private void applyMemberFields(
            Member member,
            String fullName,
            String email,
            String phone,
            LocalDate dateOfBirth,
            String gender,
            String avatar,
            String status
    ) {
        member.setFullName(requiredTrim(fullName));
        member.setEmail(email);
        member.setPhone(phone);
        member.setDateOfBirth(dateOfBirth);
        member.setGender(normalizeAllowed(gender, ALLOWED_GENDERS, "Gioi tinh khong hop le."));
        member.setAvatar(nullableTrim(avatar));
        member.setStatus(normalizeAllowed(defaultIfBlank(status, "ACTIVE"), ALLOWED_STATUSES, "Trang thai khong hop le."));
    }

    private String normalizeAllowed(String value, Set<String> allowedValues, String message) {
        String normalized = nullableTrim(value);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!allowedValues.contains(normalized)) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeStatusFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new BadRequestException("Trang thai khong hop le.");
        }
        return normalized;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private Long parseMemberCode(String keyword) {
        if (keyword == null) {
            return null;
        }
        String normalized = keyword.trim().toUpperCase(Locale.ROOT);
        if (normalized.startsWith("MB")) {
            normalized = normalized.substring(2);
        }
        if (!normalized.matches("\\d+")) {
            return null;
        }
        try {
            return Long.parseLong(normalized);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String nullableTrim(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private String requiredTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.trim().isEmpty() ? defaultValue : value;
    }
}
