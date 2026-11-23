package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="academy_teachers") public class AcademyTeacher { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; public String name; public String subject; @Column(columnDefinition="TEXT") public String bio; public String email; public boolean active=true; }
