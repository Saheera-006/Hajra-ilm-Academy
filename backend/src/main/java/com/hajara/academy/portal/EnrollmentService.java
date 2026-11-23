package com.hajara.academy.portal;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnrollmentService {

    private final EnrollmentRepo enrollments;

    public EnrollmentService(EnrollmentRepo enrollments) {
        this.enrollments = enrollments;
    }

    /** Creates or extends an enrollment by one month / one year (extending from the current expiry if still active). */
    @Transactional
    public PortalEnrollment activate(Long userId, Long courseId, String plan, String renewalMode) {
        PortalEnrollment e = enrollments.findByUserIdAndCourseId(userId, courseId).orElseGet(PortalEnrollment::new);
        e.userId = userId;
        e.courseId = courseId;
        e.plan = plan;
        e.renewalMode = renewalMode;
        e.status = "ACTIVE";
        e.expiresAt = null; // Set to the assigned batch end by the caller.
        return enrollments.save(e);
    }
}
