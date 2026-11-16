package com.hajara.academy.portal;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserRepo extends JpaRepository<PortalUser, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<PortalUser> findByIdAndRole(Long id, String role);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    Optional<PortalUser> findByEmailIgnoreCaseAndRole(String email, String role);

    Optional<PortalUser> findByEmailIgnoreCase(String email);

    Optional<PortalUser> findByPhone(String phone);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    /** Atomically advances the last-used TOTP step. Returns 1 only for the first request that uses a given step. */
    @Transactional
    @Modifying
    @Query("update PortalUser u set u.mfaLastStep = :step where u.id = :id and (u.mfaLastStep is null or u.mfaLastStep < :step)")
    int advanceMfaStep(@Param("id") Long id, @Param("step") long step);
}
