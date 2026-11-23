package com.hajara.academy.portal;
import jakarta.persistence.*; import java.math.BigDecimal;
@Entity @Table(name="portal_payments") public class PortalPayment {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(name="enrollment_id") public Long enrollmentId;
 public String provider; public String status; public BigDecimal amount;
 @Column(name="reference_code") public String referenceCode;
}
