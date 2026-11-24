package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="academy_certificates") public class AcademyCertificate { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(name="enrollment_id",unique=true) public Long enrollmentId; @Column(name="issued_at") public java.time.Instant issuedAt=java.time.Instant.now(); @Column(name="certificate_code",unique=true) public String certificateCode; @Column(name="email_status") public String emailStatus; }
