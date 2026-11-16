package com.hajara.academy.portal;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CourseRepo extends JpaRepository<PortalCourse, Long> {
    List<PortalCourse> findByActiveTrueOrderByIdAsc();
}
