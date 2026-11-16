package com.hajara.academy.portal;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PaymentRepo extends JpaRepository<PortalPayment,Long> {  }
