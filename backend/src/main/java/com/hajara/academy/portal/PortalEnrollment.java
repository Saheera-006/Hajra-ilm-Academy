package com.hajara.academy.portal;
import jakarta.persistence.*; import java.time.Instant;
@Entity @Table(name="portal_enrollments") public class PortalEnrollment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(name="user_id") public Long userId;
 @Column(name="course_id") public Long courseId;
 @Column(name="batch_id") public Long batchId;
 public String plan; @Column(name="renewal_mode") public String renewalMode;
 public String status;
 @Column(name="expires_at") public Instant expiresAt;
}
