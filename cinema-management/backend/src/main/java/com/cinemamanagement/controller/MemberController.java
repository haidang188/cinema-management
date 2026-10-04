package com.cinemamanagement.controller;

import com.cinemamanagement.request.UpdateMemberRequest;
import com.cinemamanagement.response.MemberResponse;
import com.cinemamanagement.response.MemberStatisticsResponse;
import com.cinemamanagement.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/members")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class MemberController {
    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    public Page<MemberResponse> getMembers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return memberService.getMembers(keyword, status, pageable);
    }

    @GetMapping("/{id}")
    public MemberResponse getMember(@PathVariable Long id) {
        return memberService.getMember(id);
    }

    @GetMapping("/statistics")
    public MemberStatisticsResponse getStatistics() {
        return memberService.getStatistics();
    }

    @PutMapping("/{id}")
    public MemberResponse updateMember(@PathVariable Long id, @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.updateMember(id, request);
    }
}
