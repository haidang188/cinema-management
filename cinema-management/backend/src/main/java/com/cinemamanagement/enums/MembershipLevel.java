package com.cinemamanagement.enums;

public enum MembershipLevel {
    BASIC(0),
    SILVER(100),
    GOLD(300),
    PLATINUM(600);

    private final int minimumPoints;

    MembershipLevel(int minimumPoints) {
        this.minimumPoints = minimumPoints;
    }

    public int getMinimumPoints() {
        return minimumPoints;
    }

    public static MembershipLevel fromPoints(int points) {
        if (points >= PLATINUM.minimumPoints) return PLATINUM;
        if (points >= GOLD.minimumPoints) return GOLD;
        if (points >= SILVER.minimumPoints) return SILVER;
        return BASIC;
    }
}
