package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Member;
import com.cinemamanagement.enums.MemberStatus;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.DeleteAccountRequest;
import com.cinemamanagement.request.RestoreAccountRequest;
import com.cinemamanagement.request.UpdateAccountRequest;
import com.cinemamanagement.response.AccountProfileResponse;
import com.cinemamanagement.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {
    private static final Set<String> GENDERS = Set.of("MALE", "FEMALE", "OTHER");
    private static final int DELETION_GRACE_DAYS = 30;

    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public AccountProfileResponse getProfile(Long userId) {
        return AccountProfileResponse.from(findMember(userId));
    }

    @Override
    @Transactional
    public AccountProfileResponse updateProfile(Long userId, UpdateAccountRequest request) {
        Member member = findMember(userId);
        requireActive(member);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = request.phone().trim();
        if (userRepository.existsByUsernameIgnoreCaseAndIdNot(email, member.getUser().getId())
                || memberRepository.existsByEmailIgnoreCaseAndIdNot(email, member.getId())) {
            throw new ConflictException("Email đã được sử dụng");
        }
        if (memberRepository.existsByPhoneAndIdNot(phone, member.getId())) {
            throw new ConflictException("Số điện thoại đã được sử dụng");
        }

        String gender = request.gender() == null || request.gender().isBlank()
                ? null : request.gender().trim().toUpperCase(Locale.ROOT);
        if (gender != null && !GENDERS.contains(gender)) throw new BadRequestException("Giới tính không hợp lệ");

        member.setFullName(request.fullName().trim());
        member.setEmail(email);
        member.setPhone(phone);
        member.setDateOfBirth(request.dateOfBirth());
        member.setGender(gender);
        member.setAvatar(blankToNull(request.avatar()));
        member.setUpdatedAt(LocalDateTime.now());
        member.getUser().setUsername(email);
        userRepository.save(member.getUser());
        return AccountProfileResponse.from(memberRepository.save(member));
    }

    @Override
    @Transactional
    public AccountProfileResponse requestDeletion(Long userId, DeleteAccountRequest request) {
        Member member = findMember(userId);
        requireActive(member);
        verifyPassword(member, request.password());
        LocalDateTime now = LocalDateTime.now();
        member.setStatus(MemberStatus.PENDING_DELETION.name());
        member.setDeletionRequestedAt(now);
        member.setScheduledDeletionAt(now.plusDays(DELETION_GRACE_DAYS));
        member.setDeletionReason(blankToNull(request.reason()));
        member.setUpdatedAt(now);
        return AccountProfileResponse.from(memberRepository.save(member));
    }

    @Override
    @Transactional
    public AccountProfileResponse restore(Long userId, RestoreAccountRequest request) {
        Member member = findMember(userId);
        if (!MemberStatus.PENDING_DELETION.name().equals(member.getStatus())) {
            throw new ConflictException("Tài khoản không ở trạng thái chờ xóa");
        }
        verifyPassword(member, request.password());
        member.setStatus(MemberStatus.ACTIVE.name());
        member.setDeletionRequestedAt(null);
        member.setScheduledDeletionAt(null);
        member.setDeletionReason(null);
        member.setUpdatedAt(LocalDateTime.now());
        return AccountProfileResponse.from(memberRepository.save(member));
    }

    @Override
    @Transactional
    public void deleteExpiredAccounts() {
        for (Member member : memberRepository.findAllByStatusAndScheduledDeletionAtLessThanEqual(
                MemberStatus.PENDING_DELETION.name(), LocalDateTime.now())) {
            LocalDateTime now = LocalDateTime.now();
            String anonymousEmail = "deleted-" + member.getUser().getId() + "-" + UUID.randomUUID() + "@deleted.local";
            member.getUser().setUsername(anonymousEmail);
            member.getUser().setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            userRepository.save(member.getUser());
            member.setFullName("Người dùng đã xóa");
            member.setEmail(anonymousEmail);
            member.setPhone(null);
            member.setDateOfBirth(null);
            member.setGender(null);
            member.setAvatar(null);
            member.setStatus(MemberStatus.DELETED.name());
            member.setDeletedAt(now);
            member.setUpdatedAt(now);
            memberRepository.save(member);
        }
    }

    private Member findMember(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ thành viên"));
    }

    private void requireActive(Member member) {
        if (!MemberStatus.ACTIVE.name().equals(member.getStatus())) {
            throw new ConflictException("Tài khoản không ở trạng thái hoạt động");
        }
    }

    private void verifyPassword(Member member, String password) {
        if (!passwordEncoder.matches(password, member.getUser().getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
