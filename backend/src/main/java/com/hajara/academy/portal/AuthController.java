package com.hajara.academy.portal;

import com.hajara.academy.security.AdminTotp;
import com.hajara.academy.security.PasswordPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/**
 * Registration, login, logout and the administrator MFA flow.
 *
 * Admin login is two-step: password -> "pending" session (no authorities) -> TOTP or recovery code -> real session.
 * Failed password and MFA attempts share one counter per account (5 failures = 15 minute lock).
 */
@RestController
@RequestMapping("/api/portal")
public class AuthController {

    private static final int MAX_FAILURES = 5;
    private static final Duration LOCK_TIME = Duration.ofMinutes(15);
    private static final Duration PENDING_TTL = Duration.ofMinutes(5);
    private static final int STUDENT_IDLE_SECONDS = 30 * 60;
    private static final int ADMIN_IDLE_SECONDS = 12 * 60 * 60;
    private static final String ISSUER = "Hajara Ilm Academy";
    private static final String PENDING_ADMIN_ID = "PENDING_ADMIN_ID";
    private static final String PENDING_ADMIN_AT = "PENDING_ADMIN_AT";
    private static final String MFA_SETUP_SECRET = "MFA_SETUP_SECRET";

    private final TrustedAdminDevices trusted;
    private final RememberedStudentDevices rememberedStudents;
    private final BatchService batches;
    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final AdminTotp totp;
    private final RecoveryCodes recoveryCodes;
    private final AuditLog audit;
    private final CurrentUser currentUser;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();
    /** Compared against when the account does not exist, so response time does not reveal which accounts exist. */
    private final String dummyHash;

    public AuthController(UserRepo users, PasswordEncoder encoder, AdminTotp totp, RecoveryCodes recoveryCodes,
            AuditLog audit, CurrentUser currentUser, BatchService batches, TrustedAdminDevices trusted, RememberedStudentDevices rememberedStudents) {
        this.rememberedStudents = rememberedStudents;
        this.trusted = trusted;
        this.batches = batches;
        this.users = users;
        this.encoder = encoder;
        this.totp = totp;
        this.recoveryCodes = recoveryCodes;
        this.audit = audit;
        this.currentUser = currentUser;
        this.dummyHash = encoder.encode("timing-equalisation-placeholder");
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-store, private");
        return Map.of("token", token.getToken());
    }

    // ------------------------------------------------------------------ registration

    // Legacy registration is intentionally disabled: account creation is completed only
    // by the server-side demo checkout confirmation endpoint.
    @PostMapping("/auth/register")
    public Map<String, String> register() {
        throw new ResponseStatusException(HttpStatus.GONE,
            "Use the demo checkout to enroll. No account is created before successful simulation.");
    }

    // ------------------------------------------------------------------ login / logout

    @PostMapping("/auth/login")
    public Map<String, Object> login(@Valid @RequestBody PortalDtos.Login r, HttpServletRequest request,
            HttpServletResponse response) {
        PortalUser u = findByIdentifier(r.identifier().trim());
        if (u == null) {
            encoder.matches(r.password(), dummyHash);
            throw invalidCredentials();
        }
        if (isLocked(u)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed attempts. Please try again in a few minutes.");
        }
        if (!encoder.matches(r.password(), u.passwordHash)) {
            registerFailure(u, request, "LOGIN_FAILED");
            throw invalidCredentials();
        }

        // The admin sign-in page must never create a student session (checked here, not only in the browser).
        if ("admin".equalsIgnoreCase(r.portal()) && !"ADMIN".equals(u.role)) {
            registerFailure(u, request, "LOGIN_WRONG_PORTAL");
            throw invalidCredentials();
        }

        // Always start from a fresh session after a successful password check (prevents session fixation).
        HttpSession old = request.getSession(false);
        if (old != null) {
            old.invalidate();
        }
        HttpSession session = request.getSession(true);

        if ("ADMIN".equals(u.role)) {
            if (!totp.configured()) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Administrator login is not configured on the server.");
            }
            PortalUser remembered = trusted.restore(request);
            if (remembered != null && remembered.id.equals(u.id)) {
                clearFailures(u);
                establishSession(u, request, response);
                return userBody(u);
            }
            // Password accepted, but no authorities yet: only the MFA endpoints can use this pending state.
            session.setMaxInactiveInterval((int) PENDING_TTL.toSeconds());
            session.setAttribute(PENDING_ADMIN_ID, u.id);
            session.setAttribute(PENDING_ADMIN_AT, System.currentTimeMillis());
            audit.record(u.id, "ADMIN_PASSWORD_ACCEPTED", request, "MFA required");
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("mfaRequired", true);
            body.put("mfaSetupRequired", !u.mfaEnabled);
            return body;
        }

        clearFailures(u);
        establishSession(u, request, response);
        rememberedStudents.issue(u, request, response);
        return userBody(u);
    }

    @PostMapping("/auth/logout")
    public Map<String, String> logout(HttpServletRequest request, HttpServletResponse response) {
        trusted.revoke(request,response);
        rememberedStudents.revoke(request,response);
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("message", "Logged out");
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication auth,HttpServletRequest request,HttpServletResponse response) {
        PortalUser u;
        if(auth==null||!auth.isAuthenticated()||!auth.getName().matches("[0-9]+")){
            u=trusted.restore(request);
            if(u==null)u=rememberedStudents.restore(request);
            if(u==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
            establishSession(u,request,response);
        }else{u=currentUser.require(auth);}
        Map<String, Object> body = userBody(u);
        body.put("email", u.email);
        body.put("phone", u.phone);
        return body;
    }

    // ------------------------------------------------------------------ administrator MFA

    @PostMapping("/auth/admin/mfa/setup")
    public Map<String, String> setupMfa(HttpServletRequest request) {
        PortalUser u = pendingAdmin(request);
        if (u.mfaEnabled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MFA is already enabled.");
        }
        String secret = totp.newSecret();
        request.getSession().setAttribute(MFA_SETUP_SECRET, secret);
        String label = encodeUriPart(ISSUER + ":" + u.email);
        String uri = "otpauth://totp/" + label + "?secret=" + secret
            + "&issuer=" + encodeUriPart(ISSUER) + "&digits=6&period=30";
        Map<String, String> body = new LinkedHashMap<>();
        body.put("secret", secret);
        body.put("otpauthUrl", uri);
        return body;
    }

    @PostMapping("/auth/admin/mfa/confirm")
    public Map<String, Object> confirmMfa(@Valid @RequestBody PortalDtos.MfaCode body, HttpServletRequest request,
            HttpServletResponse response) {
        PortalUser u = pendingAdmin(request);
        if (u.mfaEnabled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "MFA is already enabled.");
        }
        HttpSession session = request.getSession(false);
        Object secretValue = session == null ? null : session.getAttribute(MFA_SETUP_SECRET);
        if (!(secretValue instanceof String)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start MFA setup first.");
        }
        String secret = (String) secretValue;
        long step = totp.matchingStep(secret, body.code().trim());
        if (step < 0) {
            registerFailure(u, request, "ADMIN_MFA_FAILED");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid code.");
        }
        u.mfaSecret = totp.encrypt(secret);
        u.mfaEnabled = true;
        u.mfaLastStep = step;
        u.failedAttempts = 0;
        u.lockedUntil = null;
        users.save(u);
        List<String> codes = recoveryCodes.issue(u.id);
        audit.record(u.id, "ADMIN_MFA_ENABLED", request, "TOTP enabled, recovery codes issued");

        establishSession(u, request, response);
        trusted.issue(u, request, response);
        Map<String, Object> result = userBody(u);
        result.put("recoveryCodes", codes);
        return result;
    }

    @PostMapping("/auth/admin/mfa/verify")
    public Map<String, Object> verifyMfa(@Valid @RequestBody PortalDtos.MfaCode body, HttpServletRequest request,
            HttpServletResponse response) {
        PortalUser u = pendingAdmin(request);
        if (!u.mfaEnabled || u.mfaSecret == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "MFA setup required.");
        }
        String code = body.code().trim();
        boolean ok;
        boolean usedRecovery = false;
        if (code.matches("[0-9]{6}")) {
            long step = totp.matchingStep(totp.decrypt(u.mfaSecret), code);
            ok = step >= 0 && users.advanceMfaStep(u.id, step) == 1;
            if (ok) {
                u.mfaLastStep = step;
            }
        } else {
            ok = recoveryCodes.consume(u.id, code);
            usedRecovery = ok;
        }
        if (!ok) {
            registerFailure(u, request, "ADMIN_MFA_FAILED");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid verification code.");
        }
        u.failedAttempts = 0;
        u.lockedUntil = null;
        users.save(u);
        audit.record(u.id, "ADMIN_LOGIN_SUCCESS", request, usedRecovery ? "Recovery code used" : "TOTP verified");

        establishSession(u, request, response);
        trusted.issue(u, request, response);
        Map<String, Object> result = userBody(u);
        result.put("usedRecoveryCode", usedRecovery);
        return result;
    }

    // ------------------------------------------------------------------ helpers

    private PortalUser findByIdentifier(String identifier) {
        return users.findByEmailIgnoreCase(identifier.toLowerCase(Locale.ROOT)).orElse(null);
    }

    private static String encodeUriPart(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials.");
    }

    private static boolean isLocked(PortalUser u) {
        return u.lockedUntil != null && u.lockedUntil.isAfter(Instant.now());
    }

    private void registerFailure(PortalUser u, HttpServletRequest request, String action) {
        u.failedAttempts++;
        if (u.failedAttempts >= MAX_FAILURES) {
            u.lockedUntil = Instant.now().plus(LOCK_TIME);
            u.failedAttempts = 0;
            audit.record(u.id, "ACCOUNT_LOCKED", request, "Too many failed attempts");
        }
        users.save(u);
        if ("ADMIN".equals(u.role)) {
            audit.record(u.id, action, request, "Failed attempt");
        }
    }

    private void clearFailures(PortalUser u) {
        if (u.failedAttempts != 0 || u.lockedUntil != null) {
            u.failedAttempts = 0;
            u.lockedUntil = null;
            users.save(u);
        }
    }

    /** The admin whose password was accepted in this session and who still has to pass MFA. */
    private PortalUser pendingAdmin(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again.");
        }
        Object idValue = session.getAttribute(PENDING_ADMIN_ID);
        Object startedValue = session.getAttribute(PENDING_ADMIN_AT);
        if (!(idValue instanceof Long) || !(startedValue instanceof Long)
                || System.currentTimeMillis() - (Long) startedValue > PENDING_TTL.toMillis()) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again.");
        }
        PortalUser u = users.findById((Long) idValue)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again."));
        if (!"ADMIN".equals(u.role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (isLocked(u)) {
            session.invalidate();
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Too many failed attempts. Please try again in a few minutes.");
        }
        return u;
    }

    private void establishSession(PortalUser u, HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(true);
        session.removeAttribute(PENDING_ADMIN_ID);
        session.removeAttribute(PENDING_ADMIN_AT);
        session.removeAttribute(MFA_SETUP_SECRET);
        request.changeSessionId();
        session.setMaxInactiveInterval("ADMIN".equals(u.role) ? ADMIN_IDLE_SECONDS : STUDENT_IDLE_SECONDS);

        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
            String.valueOf(u.id), null, List.of(new SimpleGrantedAuthority("ROLE_" + u.role)));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }

    private static Map<String, Object> userBody(PortalUser u) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", u.id);
        body.put("name", u.fullName);
        body.put("role", u.role);
        return body;
    }
}
