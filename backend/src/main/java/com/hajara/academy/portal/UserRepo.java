package com.hajara.academy.portal;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserRepo extends JpaRepository<PortalUser, Long> {

    // Lock student/admin record by ID
    @Query(
        value = """
            SELECT *
            FROM portal_users
            WHERE id = :id
              AND role = :role
            FOR UPDATE
            """,
        nativeQuery = true
    )
    Optional<PortalUser> findByIdAndRole(
        @Param("id") Long id,
        @Param("role") String role
    );

    // Lock student/admin record by email
    @Query(
        value = """
            SELECT *
            FROM portal_users
            WHERE UPPER(email) = UPPER(:email)
              AND role = :role
            FOR UPDATE
            """,
        nativeQuery = true
    )
    Optional<PortalUser> findByEmailIgnoreCaseAndRole(
        @Param("email") String email,
        @Param("role") String role
    );

    Optional<PortalUser> findByEmailIgnoreCase(String email);

    Optional<PortalUser> findByPhone(String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    /**
     * Atomically advances the last-used TOTP step.
     * Returns 1 only for the first request using a given step.
     */
    @Transactional
    @Modifying
    @Query("""
        UPDATE PortalUser u
        SET u.mfaLastStep = :step
        WHERE u.id = :id
          AND (
              u.mfaLastStep IS NULL
              OR u.mfaLastStep < :step
          )
        """)
    int advanceMfaStep(
        @Param("id") Long id,
        @Param("step") long step
    );
}
