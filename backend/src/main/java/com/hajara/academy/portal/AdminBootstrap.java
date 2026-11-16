package com.hajara.academy.portal;

import com.hajara.academy.security.AdminTotp;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first administrator from ADMIN_EMAIL / ADMIN_PASSWORD, once. Never resets an existing account. */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepo users;
    private final PasswordEncoder encoder;
    private final AdminTotp totp;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepo users, PasswordEncoder encoder, AdminTotp totp,
            @Value("${app.portal.admin-email:}") String email,
            @Value("${app.portal.admin-password:}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.totp = totp;
        this.email = email == null ? "" : email.trim();
        this.password = password == null ? "" : password;
    }

    @Override
    public void run(String... args) {
        if (email.isBlank() || password.isBlank()) {
            return;
        }
        if (password.length() < 16) {
            throw new IllegalStateException("ADMIN_PASSWORD must be at least 16 characters");
        }
        if (!totp.configured()) {
            throw new IllegalStateException(
                "ADMIN_MFA_ENCRYPTION_KEY is required when an administrator is configured "
                + "(generate one with start-backend.ps1 or see ADMIN_SECURITY_SETUP.md)");
        }
        String normalized = email.toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(normalized)) {
            return;
        }
        PortalUser admin = new PortalUser();
        admin.fullName = "Academy Administrator";
        admin.age = 18;
        admin.email = normalized;
        admin.phone = "ADMIN-" + UUID.randomUUID().toString().substring(0, 12);
        admin.passwordHash = encoder.encode(password);
        admin.role = "ADMIN";
        users.save(admin);
        log.info("Administrator account created for {}. Sign in at /admin/login to enrol your authenticator app.", normalized);
    }
}
