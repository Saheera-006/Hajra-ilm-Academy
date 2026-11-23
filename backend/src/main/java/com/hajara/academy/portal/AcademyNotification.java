package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="academy_notifications") public class AcademyNotification { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(name="user_id") public Long userId; @Column(name="student_id") public String studentId; @Column(name="batch_id") public Long batchId; public String title; @Column(columnDefinition="TEXT") public String message; @Column(name="created_at") public java.time.Instant createdAt=java.time.Instant.now(); }
