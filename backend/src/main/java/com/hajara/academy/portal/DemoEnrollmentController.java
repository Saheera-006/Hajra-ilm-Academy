package com.hajara.academy.portal;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.security.SecureRandom;
import java.util.HashMap;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** TEST ONLY: never treat simulated payments as proof of real payment. */
@RestController
@RequestMapping("/api/portal/auth/demo-checkout")
public class DemoEnrollmentController {
    private static final String PENDING = "HIA_DEMO_PENDING";
    private static final String VERIFICATION = "HIA_EMAIL_VERIFICATION";
    private static final String LAST_EMAIL = "HIA_LAST_EMAIL";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final StudentMail mail;
    private final BatchService batches;
    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final DemoEnrollmentService service;

    public DemoEnrollmentController(BatchService batches, UserRepo users,
            PasswordEncoder encoder, DemoEnrollmentService service, StudentMail mail) {
        this.batches = batches;
        this.users = users;
        this.encoder = encoder;
        this.service = service;
        this.mail = mail;
    }

    public record Pending(String name, int age, String email, String phone,
            String passwordHash, Long batchId, Instant createdAt, String checkoutId) {}
    private record Verification(String hash, int attempts) {}
    public record EmailCode(String checkoutId,
        @jakarta.validation.constraints.NotBlank
        @jakarta.validation.constraints.Pattern(regexp = "[0-9]{6}") String code) {}
    public record Confirmation(String checkoutId, boolean simulateSuccess) {}

    @PostMapping("/prepare")
    public Map<String, Object> prepare(@Valid @RequestBody PortalDtos.Register r, HttpSession session) {
        var batch = batches.openBatch();
        if (batch.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Enrollment is closed.");
        String email = r.email().trim().toLowerCase(Locale.ROOT);
        String issue = com.hajara.academy.security.PasswordPolicy.violation(r.password(), email);
        if (issue != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, issue);
        String phone = StudentPhone.normalize(r.phone());
        if (users.existsByEmailIgnoreCase(email) || users.existsByPhone(phone))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with these details already exists.");
        synchronized (session) {
            Instant now = Instant.now();
            if (session.getAttribute(LAST_EMAIL) instanceof Instant last && last.plusSeconds(60).isAfter(now))
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Wait one minute before requesting another code.");
            String checkoutId = UUID.randomUUID().toString();
            String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
            session.setAttribute(LAST_EMAIL, now);
            mail.verification(email, code);
            session.setAttribute(PENDING, new Pending(r.name().trim(), r.age(), email, phone,
                encoder.encode(r.password()), ((Number) batch.get("id")).longValue(), now, checkoutId));
            session.setAttribute(VERIFICATION, new Verification(encoder.encode(code), 0));
            return Map.of("checkoutId", checkoutId);
        }
    }

    @PostMapping("/verify-email")
    public Map<String, Object> verifyEmail(@Valid @RequestBody EmailCode request, HttpSession session) {
        synchronized (session) {
            Pending pending = pending(session, request.checkoutId());
            Object state = session.getAttribute(VERIFICATION);
            if (!Boolean.TRUE.equals(state)) {
                if (!(state instanceof Verification verification))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Request a new verification code to continue.");
                if (verification.attempts() >= 5)
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Start registration again to request a new code.");
                if (!encoder.matches(request.code(), verification.hash())) {
                    session.setAttribute(VERIFICATION, new Verification(verification.hash(), verification.attempts() + 1));
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect email verification code.");
                }
                session.setAttribute(VERIFICATION, Boolean.TRUE);
            }
            var batch = batches.openBatch();
            if (batch.isEmpty() || ((Number) batch.get("id")).longValue() != pending.batchId())
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Enrollment window has closed.");
            return Map.of("checkoutId", pending.checkoutId(), "amount", batch.get("course_fee"), "razorpay", !razorpayKey.isBlank(), "demoEnabled", demoEnabled && razorpayKey.isBlank());
        }
    }

    Pending pending(HttpSession session, String checkoutId) {
        if (!(session.getAttribute(PENDING) instanceof Pending pending) ||
                !pending.checkoutId().equals(checkoutId) ||
                !pending.createdAt().plus(Duration.ofMinutes(15)).isAfter(Instant.now()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This enrollment session expired or was opened in another browser. Start registration again on this website to request a fresh code.");
        return pending;
    }

    Pending verifiedPending(HttpSession session, String id) {
        Pending p = pending(session,id);
        if (!Boolean.TRUE.equals(session.getAttribute(VERIFICATION))) throw new ResponseStatusException(HttpStatus.CONFLICT,"Verify email first.");
        return p;
    }
    @org.springframework.beans.factory.annotation.Value("${app.portal.demo-payments:false}") private boolean demoEnabled;
    @org.springframework.beans.factory.annotation.Value("${RAZORPAY_KEY_ID:}") private String razorpayKey;
    @PostMapping("/confirm")
    public Map<String, Object> confirm(@RequestBody Confirmation confirmation, HttpSession session) {
        if (!demoEnabled || !razorpayKey.isBlank()) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Demo payment disabled.");
        Pending pending;
        Map<String, Object> result;
        synchronized (session) {
            pending = pending(session, confirmation.checkoutId());
            if (!Boolean.TRUE.equals(session.getAttribute(VERIFICATION)))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Verify your email before continuing.");
            if (!confirmation.simulateSuccess()) {
                session.removeAttribute(PENDING);
                session.removeAttribute(VERIFICATION);
                return Map.of("success", false, "message", "Demo payment failed. No account was created.");
            }
            result = new HashMap<>(service.complete(pending));
            session.removeAttribute(PENDING);
            session.removeAttribute(VERIFICATION);
        }
        result.put("welcomeEmailSent", mail.enrollmentWelcome(pending.email(), pending.name(), (String) result.get("studentId"), (String)batches.get(pending.batchId()).get("whatsapp_link"), null, false));
        return result;
    }
}
