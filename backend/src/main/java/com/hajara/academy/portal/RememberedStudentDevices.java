package com.hajara.academy.portal;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Revocable, password-bound remember-me credentials for students only. */
@Service
public class RememberedStudentDevices {
    private static final String COOKIE = "HIA_STUDENT_REMEMBER";
    private static final Duration LIFETIME = Duration.ofDays(30);
    private final JdbcTemplate db;
    private final UserRepo users;
    private final boolean secure;

    public RememberedStudentDevices(JdbcTemplate db, UserRepo users,
            @Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
        this.db = db;
        this.users = users;
        this.secure = secure;
    }

    private String token(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE.equals(cookie.getName()) && cookie.getValue().matches("[A-Za-z0-9_-]{43}")) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private void cookie(HttpServletResponse response, String value, long maxAge) {
        response.addHeader("Set-Cookie", ResponseCookie.from(COOKIE, value)
            .path("/api/portal").httpOnly(true).secure(secure).sameSite("Lax")
            .maxAge(maxAge).build().toString());
    }

    public void issue(PortalUser user, HttpServletRequest request, HttpServletResponse response) {
        if (!"STUDENT".equals(user.role)) return;
        revoke(request, response);
        byte[] random = new byte[32];
        new SecureRandom().nextBytes(random);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        db.update("DELETE FROM student_remembered_devices WHERE expires_at <= CURRENT_TIMESTAMP");
        db.update("INSERT INTO student_remembered_devices(token_hash,user_id,password_fingerprint,expires_at) VALUES(?,?,?,?)",
            TrustedAdminDevices.hash(raw), user.id, TrustedAdminDevices.hash(user.passwordHash),
            Timestamp.from(Instant.now().plus(LIFETIME)));
        cookie(response, raw, LIFETIME.toSeconds());
    }

    public PortalUser restore(HttpServletRequest request) {
        String raw = token(request);
        if (raw == null) return null;
        List<java.util.Map<String, Object>> rows = db.queryForList(
            "SELECT user_id,password_fingerprint FROM student_remembered_devices WHERE token_hash=? AND expires_at>CURRENT_TIMESTAMP",
            TrustedAdminDevices.hash(raw));
        if (rows.isEmpty()) return null;
        var row = rows.get(0);
        PortalUser user = users.findById(((Number)row.get("user_id")).longValue()).orElse(null);
        if (user == null || !"STUDENT".equals(user.role)
                || (user.lockedUntil != null && user.lockedUntil.isAfter(Instant.now()))
                || !TrustedAdminDevices.hash(user.passwordHash).equals(row.get("password_fingerprint"))) return null;
        return user;
    }

    public void revoke(HttpServletRequest request, HttpServletResponse response) {
        String raw = token(request);
        if (raw != null) db.update("DELETE FROM student_remembered_devices WHERE token_hash=?",
            TrustedAdminDevices.hash(raw));
        cookie(response, "", 0);
    }
}
