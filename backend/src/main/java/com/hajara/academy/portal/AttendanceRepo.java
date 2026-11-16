package com.hajara.academy.portal;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AttendanceRepo extends JpaRepository<PortalAttendance, Long> {
    List<PortalAttendance> findByEnrollmentIdInOrderByClassDateDesc(Collection<Long> enrollmentIds);

    Optional<PortalAttendance> findByEnrollmentIdAndClassDate(Long enrollmentId, LocalDate classDate);
}
