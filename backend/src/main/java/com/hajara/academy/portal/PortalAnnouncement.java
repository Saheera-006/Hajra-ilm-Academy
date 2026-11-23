package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="portal_announcements") public class PortalAnnouncement {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @Column(name="batch_id") public Long batchId;
 public String title; public String body;
}
