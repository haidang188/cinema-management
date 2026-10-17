package com.cinemamanagement.service;

import com.cinemamanagement.entity.Member;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.enums.MemberStatus;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.DeleteAccountRequest;
import com.cinemamanagement.request.RestoreAccountRequest;
import com.cinemamanagement.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AccountServiceImplTest {
    private MemberRepository memberRepository;
    private AccountServiceImpl service;
    private Member member;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        service = new AccountServiceImpl(memberRepository, userRepository, encoder);
        User user = new User();
        user.setId(9L);
        user.setUsername("member@example.com");
        user.setPassword(encoder.encode("secret123"));
        member = new Member();
        member.setId(4L);
        member.setUser(user);
        member.setFullName("Member Test");
        member.setEmail("member@example.com");
        member.setStatus(MemberStatus.ACTIVE.name());
        when(memberRepository.findByUserId(9L)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void deletionRequestLocksForThirtyDays() {
        LocalDateTime before = LocalDateTime.now();
        var response = service.requestDeletion(9L, new DeleteAccountRequest("secret123", "Không còn nhu cầu"));

        assertEquals(MemberStatus.PENDING_DELETION.name(), response.status());
        assertNotNull(response.scheduledDeletionAt());
        long days = Duration.between(before, response.scheduledDeletionAt()).toDays();
        assertTrue(days == 29 || days == 30);
    }

    @Test
    void restoreClearsDeletionSchedule() {
        member.setStatus(MemberStatus.PENDING_DELETION.name());
        member.setDeletionRequestedAt(LocalDateTime.now());
        member.setScheduledDeletionAt(LocalDateTime.now().plusDays(30));

        var response = service.restore(9L, new RestoreAccountRequest("secret123"));

        assertEquals(MemberStatus.ACTIVE.name(), response.status());
        assertNull(response.deletionRequestedAt());
        assertNull(response.scheduledDeletionAt());
    }
}
