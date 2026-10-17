package com.cinemamanagement.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MembershipLevelTest {
    @Test
    void resolvesThresholdsExactly() {
        assertEquals(MembershipLevel.BASIC, MembershipLevel.fromPoints(0));
        assertEquals(MembershipLevel.BASIC, MembershipLevel.fromPoints(99));
        assertEquals(MembershipLevel.SILVER, MembershipLevel.fromPoints(100));
        assertEquals(MembershipLevel.SILVER, MembershipLevel.fromPoints(299));
        assertEquals(MembershipLevel.GOLD, MembershipLevel.fromPoints(300));
        assertEquals(MembershipLevel.GOLD, MembershipLevel.fromPoints(599));
        assertEquals(MembershipLevel.PLATINUM, MembershipLevel.fromPoints(600));
    }
}
