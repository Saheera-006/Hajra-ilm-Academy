package com.hajara.academy.portal;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnrollmentRepo extends JpaRepository<PortalEnrollment, Long> {
    List<PortalEnrollment> findByUserId(Long userId);

    Optional<PortalEnrollment> findByUserIdAndCourseId(Long userId, Long courseId);
}
