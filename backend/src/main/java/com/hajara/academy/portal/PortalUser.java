package com.hajara.academy.portal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "portal_users")
public class PortalUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @Column(name = "full_name")
    public String fullName;

    public int age;
    public String email;
    public String phone;

    @Column(name = "email_verified", nullable = false)
    public boolean emailVerified;

    @Column(name = "password_hash")
    public String passwordHash;

    public String role = "STUDENT";

    @Column(name="student_number")
    public String studentNumber;

    @Column(name = "mfa_secret")
    public String mfaSecret;

    @Column(name = "mfa_enabled", nullable = false)
    public boolean mfaEnabled = false;

    /** Last accepted TOTP time step; codes at or before it are rejected (replay protection). */
    @Column(name = "mfa_last_step")
    public Long mfaLastStep;

    /** Failed password / MFA attempts since the last success (account lockout). */
    @Column(name = "failed_attempts", nullable = false)
    public int failedAttempts = 0;

    @Column(name = "locked_until")
    public Instant lockedUntil;
}
