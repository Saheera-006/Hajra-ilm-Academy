package com.hajara.academy.portal;
import jakarta.persistence.*; import java.time.LocalDate;
@Entity @Table(name="portal_attendance") public class PortalAttendance {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(name="enrollment_id") public Long enrollmentId;
 @Column(name="class_date") public LocalDate classDate;
 public String status;
}
