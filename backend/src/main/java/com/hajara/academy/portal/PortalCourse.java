package com.hajara.academy.portal;
import jakarta.persistence.*; import java.math.BigDecimal;
@Entity @Table(name="portal_courses") public class PortalCourse {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 public String title; public String description;
 @Column(name="monthly_price") public BigDecimal monthlyPrice;
 @Column(name="yearly_price") public BigDecimal yearlyPrice;
 @Column(name="meet_url") public String meetUrl;
 public boolean active=true;
}
