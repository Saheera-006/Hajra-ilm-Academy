package com.hajara.academy.portal;

import com.hajara.academy.security.PasswordPolicy;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/portal/my-profile")
public class StudentProfileController {
    private static final String EMAIL_CHANGE = StudentProfileController.class.getName() + ".emailChange";
    private static final String LAST_SENT = StudentProfileController.class.getName() + ".lastSent";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CurrentUser current;
    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final StudentMail mail;
    private final JdbcTemplate db;

    public StudentProfileController(CurrentUser current, UserRepo users, PasswordEncoder encoder,
            StudentMail mail, JdbcTemplate db) {
        this.current = current;
        this.users = users;
        this.encoder = encoder;
        this.mail = mail;
        this.db = db;
    }

    public record Profile(String name, int age, String phone, String email) {}
    public record Details(@NotBlank @Size(max=150) String name, @Min(5) @Max(120) int age,
        @NotBlank @Size(max=30) String phone) {}
    public record PasswordChange(@NotBlank @Size(max=72) String currentPassword,
        @NotBlank @Size(min=10,max=72) String newPassword) {}
    public record EmailRequest(@NotBlank @Email @Size(max=190) String email,
        @NotBlank @Size(max=72) String currentPassword) {}
    public record EmailCode(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    private record PendingEmail(Long userId, String originalEmail, String passwordHash, String email,
        String codeHash, Instant expires, int attempts) {}

    @GetMapping
    public Profile profile(Authentication auth) {
        return view(current.require(auth));
    }

    @PutMapping
    @Transactional
    public Profile update(Authentication auth, @Valid @RequestBody Details details) {
        var user = lockedStudent(auth);
        user.fullName = details.name().trim();
        user.age = details.age();
        user.phone = StudentPhone.normalize(details.phone());
        save(user);
        return view(user);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void changePassword(Authentication auth, @Valid @RequestBody PasswordChange change) {
        var user = lockedStudent(auth);
        checkPassword(user, change.currentPassword());
        String issue = PasswordPolicy.violation(change.newPassword(), user.email);
        if (issue != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, issue);
        user.passwordHash = encoder.encode(change.newPassword());
        save(user);
        db.update("DELETE FROM student_password_resets WHERE user_id=?", user.id);
        db.update("DELETE FROM student_remembered_devices WHERE user_id=?", user.id);
    }

    @PostMapping("/email/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestEmail(Authentication auth, @Valid @RequestBody EmailRequest input, HttpSession session) {
        synchronized (session) {
            var user = current.require(auth);
            var now = Instant.now();
            if (session.getAttribute(LAST_SENT) instanceof Instant last && last.plusSeconds(60).isAfter(now))
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Wait one minute before requesting another code.");
            checkPassword(user, input.currentPassword());
            String email = input.email().trim().toLowerCase(Locale.ROOT);
            if (users.existsByEmailIgnoreCase(email))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This email address is already in use.");
            String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
            session.setAttribute(LAST_SENT, now);
            session.removeAttribute(EMAIL_CHANGE);
            mail.verification(email, code);
            session.setAttribute(EMAIL_CHANGE, new PendingEmail(user.id, user.email, user.passwordHash, email,
                encoder.encode(code), now.plusSeconds(900), 0));
        }
    }

    @PostMapping("/email/confirm")
    @Transactional
    public Profile confirmEmail(Authentication auth, @Valid @RequestBody EmailCode input, HttpSession session) {
        var user = lockedStudent(auth);
        synchronized (session) {
            if (!(session.getAttribute(EMAIL_CHANGE) instanceof PendingEmail pending)
                    || !user.id.equals(pending.userId()) || !user.email.equals(pending.originalEmail())
                    || !user.passwordHash.equals(pending.passwordHash())
                    || !pending.expires().isAfter(Instant.now()) || pending.attempts() >= 5) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request a new verification code.");
            }
            if (!encoder.matches(input.code(), pending.codeHash())) {
                session.setAttribute(EMAIL_CHANGE, new PendingEmail(pending.userId(), pending.originalEmail(),
                    pending.passwordHash(), pending.email(), pending.codeHash(), pending.expires(), pending.attempts()+1));
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect verification code.");
            }
            user.email = pending.email();
            user.emailVerified = true;
            save(user);
            db.update("DELETE FROM student_password_resets WHERE user_id=?", user.id);
            session.removeAttribute(EMAIL_CHANGE);
            return view(user);
        }
    }

    private PortalUser lockedStudent(Authentication auth) {
        return users.findByIdAndRole(Long.valueOf(auth.getName()), "STUDENT")
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private void checkPassword(PortalUser user, String password) {
        if (!encoder.matches(password, user.passwordHash))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect.");
    }

    private void save(PortalUser user) {
        try {
            users.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This email address or phone number is already in use.");
        }
    }

    private static Profile view(PortalUser user) {
        return new Profile(user.fullName, user.age, user.phone, user.email);
    }
}
