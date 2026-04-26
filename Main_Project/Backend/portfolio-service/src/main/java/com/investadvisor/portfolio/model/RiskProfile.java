package com.investadvisor.portfolio.model;

/**
 * Investment risk tolerance for a portfolio.
 * Used by the AI intelligence service to calibrate recommendations.
 *
 * CONSERVATIVE  — capital preservation; low-volatility, dividend stocks
 * MODERATE      — balanced growth; mix of growth and income
 * AGGRESSIVE    — maximum growth; high-volatility, high-return stocks
 */
public enum RiskProfile {
    CONSERVATIVE,
    MODERATE,
    AGGRESSIVE
}
