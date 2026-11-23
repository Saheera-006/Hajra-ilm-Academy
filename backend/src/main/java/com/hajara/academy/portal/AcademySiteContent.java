package com.hajara.academy.portal;
import jakarta.persistence.*;
@Entity @Table(name="academy_site_content") public class AcademySiteContent { @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id; @Column(name="content_key",unique=true) public String contentKey; @Column(name="content_value",columnDefinition="TEXT") public String contentValue; }
