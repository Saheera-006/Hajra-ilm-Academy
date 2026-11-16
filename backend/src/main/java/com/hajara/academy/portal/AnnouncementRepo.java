package com.hajara.academy.portal;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepo extends JpaRepository<PortalAnnouncement, Long> {
}
