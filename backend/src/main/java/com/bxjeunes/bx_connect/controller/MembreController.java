package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.membre.MembreDashboardResponse;
import com.bxjeunes.bx_connect.service.MembreDashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/membre")
@PreAuthorize("hasRole('MEMBRE')")
public class MembreController {

    private final MembreDashboardService membreDashboardService;

    public MembreController(MembreDashboardService membreDashboardService) {
        this.membreDashboardService = membreDashboardService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<MembreDashboardResponse> dashboard(Authentication authentication) {
        return ResponseEntity.ok(membreDashboardService.dashboard(authentication.getName()));
    }
}
