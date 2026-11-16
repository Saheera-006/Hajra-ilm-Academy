package com.hajara.academy.controller;

import com.hajara.academy.dto.PublicSiteDto;
import com.hajara.academy.service.PublicSiteService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/public")
public class PublicSiteController {

    private final PublicSiteService service;

    public PublicSiteController(PublicSiteService service) {
        this.service = service;
    }

    @GetMapping("/site")
    public ResponseEntity<PublicSiteDto> site() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS).cachePublic())
                .body(service.load());
    }
}
