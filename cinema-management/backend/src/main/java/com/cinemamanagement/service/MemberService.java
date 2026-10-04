package com.cinemamanagement.service;

import com.cinemamanagement.request.UpdateMemberRequest;
import com.cinemamanagement.response.MemberResponse;
import com.cinemamanagement.response.MemberStatisticsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MemberService {
    Page<MemberResponse> getMembers(String keyword, String status, Pageable pageable);

    MemberResponse getMember(Long id);

    MemberStatisticsResponse getStatistics();

    MemberResponse updateMember(Long id, UpdateMemberRequest request);
}
