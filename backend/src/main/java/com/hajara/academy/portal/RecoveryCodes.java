package com.hajara.academy.portal;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time admin recovery codes, used when the authenticator device is lost.
 * Only SHA-256 hashes are stored; each code can be used once.
 */
@Component
public class RecoveryCodes {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
    private static final int COUNT = 8;
    private static final int LENGTH = 10;

    private final JdbcTemplate jdbc;
    private final SecureRandom random = new SecureRandom();

    public RecoveryCodes(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Replaces all existing codes for the user and returns the new plain-text codes (shown once). */
    @Transactional
    public List<String> issue(Long userId) {
        jdbc.update("DELETE FROM admin_recovery_codes WHERE user_id = ?", userId);
        List<String> codes = new ArrayList<>();
        for (int i = 0; i < COUNT; i++) {
            StringBuilder raw = new StringBuilder();
            for (int j = 0; j < LENGTH; j++) {
                raw.append(ALPHABET.charAt(random.nextInt(ALPHABET.length())));
            }
            jdbc.update("INSERT INTO admin_recovery_codes(user_id, code_hash) VALUES (?, ?)", userId, hash(raw.toString()));
            codes.add(raw.substring(0, 5) + "-" + raw.substring(5));
        }
        return codes;
    }

    /** Marks the code as used. Returns true for exactly one caller per valid code (atomic update). */
    public boolean consume(Long userId, String input) {
        String normalized = input == null ? "" : input.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]", "");
        if (normalized.length() != LENGTH) {
            return false;
        }
        int updated = jdbc.update(
            "UPDATE admin_recovery_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND code_hash = ? AND used_at IS NULL",
            userId, hash(normalized));
        return updated == 1;
    }

    private static String hash(String normalized) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(normalized.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
