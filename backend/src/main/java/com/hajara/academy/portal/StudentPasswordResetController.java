
package com.hajara.academy.portal;

import com.hajara.academy.security.PasswordPolicy;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/portal/auth/password-reset")
public class StudentPasswordResetController {

    private static final Logger LOG =
            LoggerFactory.getLogger(
                StudentPasswordResetController.class
            );

    private static final SecureRandom RANDOM =
            new SecureRandom();

    private static final String REQUEST_MESSAGE =
            "If this email belongs to an eligible student account, "
            + "a reset code will be sent.";

    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    private final StudentMail mail;

    public StudentPasswordResetController(
            UserRepo users,
            PasswordEncoder encoder,
            JdbcTemplate jdbc,
            StudentMail mail) {

        this.users = users;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.mail = mail;
    }

    public record RequestOtp(
        @NotBlank
        @Email
        @Size(max = 190)
        String email
    ) {}

    public record ConfirmOtp(
        @NotBlank
        @Email
        @Size(max = 190)
        String email,

        @NotBlank
        @Pattern(regexp = "[0-9]{6}")
        String code,

        @NotBlank
        @Size(min = 10, max = 72)
        String newPassword
    ) {}

    @PostMapping("/request")
    @Transactional
    public Map<String, String> request(
            @Valid @RequestBody RequestOtp request) {

        String email = request.email().trim();

        users.findByEmailIgnoreCaseAndRole(email, "STUDENT")
            .filter(user -> user.emailVerified)
            .ifPresent(user -> {

                Instant now = Instant.now();

                String code = String.format(
                    Locale.ROOT,
                    "%06d",
                    RANDOM.nextInt(1_000_000)
                );

                Timestamp cutoff =
                        Timestamp.from(now.minusSeconds(60));

                String hash = encoder.encode(code);

                jdbc.update("""
                    INSERT INTO student_password_resets
                        (user_id, otp_hash, expires_at,
                         requested_at, attempts)
                    VALUES (?, ?, ?, ?, 0)

                    ON DUPLICATE KEY UPDATE

                        otp_hash =
                            IF(requested_at <= ?,
                               VALUES(otp_hash), otp_hash),

                        expires_at =
                            IF(requested_at <= ?,
                               VALUES(expires_at), expires_at),

                        attempts =
                            IF(requested_at <= ?, 0, attempts),

                        requested_at =
                            IF(requested_at <= ?,
                               VALUES(requested_at), requested_at)
                    """,
                    user.id,
                    hash,
                    Timestamp.from(now.plusSeconds(300)),
                    Timestamp.from(now),
                    cutoff,
                    cutoff,
                    cutoff,
                    cutoff
                );

                Integer current = jdbc.queryForObject(
                    """
                    SELECT COUNT(*)
                    FROM student_password_resets
                    WHERE user_id = ?
                      AND otp_hash = ?
                    """,
                    Integer.class,
                    user.id,
                    hash
                );

                if (Integer.valueOf(1).equals(current)) {
                    try {
                        mail.passwordReset(user.email, code);
                    } catch (StudentMail.EmailDeliveryException e) {
                        LOG.error(
                            "Password reset email delivery failed"
                        );
                        throw new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Password reset email is temporarily unavailable."
                        );
                    }
                }
            });

        return Map.of("message", REQUEST_MESSAGE);
    }

    @Transactional(
        noRollbackFor = ResponseStatusException.class
    )
    @PostMapping("/confirm")
    public Map<String, String> confirm(
            @Valid @RequestBody ConfirmOtp request) {

        PortalUser user =
            users.findByEmailIgnoreCaseAndRole(
                request.email().trim(),
                "STUDENT"
            ).orElseThrow(
                StudentPasswordResetController::invalid
            );

        if (!user.emailVerified ||
            !user.email.equalsIgnoreCase(
                request.email().trim())) {
            throw invalid();
        }

        var rows = jdbc.queryForList(
            """
            SELECT otp_hash, expires_at, attempts
            FROM student_password_resets
            WHERE user_id = ?
            FOR UPDATE
            """,
            user.id
        );

        if (rows.isEmpty()) {
            throw invalid();
        }

        Map<String, Object> row = rows.get(0);

        Instant expiry =
            ((Timestamp) row.get("expires_at")).toInstant();

        int attempts =
            ((Number) row.get("attempts")).intValue();

        if (attempts >= 5 ||
            !expiry.isAfter(Instant.now())) {
            throw invalid();
        }

        int updated = jdbc.update(
            """
            UPDATE student_password_resets
            SET attempts = attempts + 1
            WHERE user_id = ?
              AND attempts < 5
              AND expires_at > ?
            """,
            user.id,
            Timestamp.from(Instant.now())
        );

        if (updated != 1) {
            throw invalid();
        }

        if (!encoder.matches(
                request.code(),
                (String) row.get("otp_hash"))) {
            throw invalid();
        }

        String issue = PasswordPolicy.violation(
            request.newPassword(),
            user.email
        );

        if (issue != null) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                issue
            );
        }

        jdbc.update(
            """
            UPDATE portal_users
            SET password_hash = ?,
                failed_attempts = 0,
                locked_until = NULL
            WHERE id = ?
            """,
            encoder.encode(request.newPassword()),
            user.id
        );

        jdbc.update(
            """
            DELETE FROM student_password_resets
            WHERE user_id = ?
            """,
            user.id
        );

        // Existing sessions require separate revocation support.

        return Map.of(
            "message",
            "Password reset successfully. Please sign in."
        );
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "Invalid or expired verification code."
        );
    }
}
