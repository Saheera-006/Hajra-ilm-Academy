package com.hajara.academy.portal;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Writes security-relevant events (logins, MFA, admin changes) to admin_audit_log. */
@Component
public class AuditLog {

    private static final Logger log = LoggerFactory.getLogger(AuditLog.class);

    private final JdbcTemplate jdbc;

    public AuditLog(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(Long actorId, String action, HttpServletRequest request, String details) {
        try {
            jdbc.update("INSERT INTO admin_audit_log(actor_id, action, ip_address, details) VALUES (?, ?, ?, ?)",
                actorId, action, request.getRemoteAddr(), truncate(details, 250));
        } catch (RuntimeException e) {
            // Never break the request because logging failed, but do not hide it either.
            log.warn("Could not write audit log entry {}: {}", action, e.getMessage());
        }
    }

    public List<Map<String, Object>> latest() {
        return jdbc.queryForList(
            "SELECT id, actor_id, action, event_time, ip_address, details FROM admin_audit_log ORDER BY id DESC LIMIT 100");
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
