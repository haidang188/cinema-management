package com.cinemamanagement.response;

public record MemberStatisticsResponse(
        long totalMembers,
        long activeMembers,
        long inactiveMembers,
        long totalPointBalance
) {
}
