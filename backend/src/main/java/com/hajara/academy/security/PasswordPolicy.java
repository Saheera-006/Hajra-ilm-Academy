package com.hajara.academy.security;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;

/** Minimal, dependency-free password rules. Returns a user-facing message, or null when the password is acceptable. */
public final class PasswordPolicy {

    private static final Set<String> COMMON = Set.of(
        "password", "password1", "password12", "password123", "1234567890", "12345678910", "qwertyuiop",
        "qwerty12345", "iloveyou123", "admin12345", "welcome123", "letmein123", "abcd123456", "0123456789");

    private PasswordPolicy() {
    }

    public static String violation(String password, String email) {
        if (password == null || password.length() < 10) {
            return "Password must be at least 10 characters.";
        }
        // BCrypt only uses the first 72 bytes; refuse longer input instead of silently truncating it.
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return "Password is too long (maximum 72 bytes).";
        }
        String lower = password.toLowerCase(Locale.ROOT);
        if (COMMON.contains(lower) || password.chars().distinct().count() < 4) {
            return "Please choose a less common password.";
        }
        if (email != null) {
            int at = email.indexOf('@');
            String local = (at > 0 ? email.substring(0, at) : email).toLowerCase(Locale.ROOT);
            if (local.length() >= 4 && lower.contains(local)) {
                return "Password must not contain your email name.";
            }
        }
        return null;
    }
}
