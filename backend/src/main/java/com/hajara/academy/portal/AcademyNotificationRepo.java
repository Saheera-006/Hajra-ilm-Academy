package com.hajara.academy.portal;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AcademyNotificationRepo extends JpaRepository<AcademyNotification, Long> {
    @Query(value = """
        SELECT n.* FROM academy_notifications n
        WHERE (n.user_id IS NULL OR n.user_id=:userId)
        AND (n.batch_id IS NULL OR EXISTS (
            SELECT 1 FROM portal_enrollments e WHERE e.user_id=:userId AND e.batch_id=n.batch_id
            AND e.status='ACTIVE' AND (e.expires_at IS NULL OR e.expires_at>UTC_TIMESTAMP(6))
        ))
        ORDER BY n.created_at DESC, n.id DESC
        """, nativeQuery = true)
    List<AcademyNotification> findVisibleTo(@Param("userId") Long userId);
}
