package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="academy_lessons") public class AcademyLesson { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(name="course_id") public Long courseId; @Column(name="learning_area") public String learningArea; public String title; @Column(columnDefinition="TEXT") public String body; @Column(name="resource_url") public String resourceUrl; @Column(name="position_number") public int positionNumber; public boolean published=false; }
