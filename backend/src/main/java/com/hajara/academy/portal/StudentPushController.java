package com.hajara.academy.portal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/portal/student-push")
class StudentPushController {
    private final JdbcTemplate db;
    private final CurrentUser current;
    private final StudentPush push;

    StudentPushController(JdbcTemplate db, CurrentUser current, StudentPush push) {
        this.db = db;
        this.current = current;
        this.push = push;
    }

    record Device(@NotBlank @Size(max=512) @Pattern(regexp="[A-Za-z0-9_:-]+") String token) {}

    @PostMapping("/subscribe")
    Map<String, Boolean> subscribe(Authentication auth, @Valid @RequestBody Device device) {
        var user = current.require(auth);
        if (!"STUDENT".equals(user.role)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (!push.enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Push notifications are not configured.");
        db.update("""
            INSERT INTO student_push_devices(token,user_id) VALUES (?,?)
            ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)
            """, device.token(), user.id);
        return Map.of("enabled", true);
    }

    @PostMapping("/unsubscribe")
    Map<String, Boolean> unsubscribe(Authentication auth, @Valid @RequestBody Device device) {
        db.update("DELETE FROM student_push_devices WHERE token=? AND user_id=?", device.token(), current.require(auth).id);
        return Map.of("enabled", false);
    }
}
