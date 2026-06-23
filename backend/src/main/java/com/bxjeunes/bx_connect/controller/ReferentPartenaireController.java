package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.ReferentPartenaireResponse;
import com.bxjeunes.bx_connect.service.PartenaireAffectationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/referent/partenaires")
@PreAuthorize("hasRole('REFERENT')")
public class ReferentPartenaireController {

    private final PartenaireAffectationService partenaireAffectationService;

    public ReferentPartenaireController(PartenaireAffectationService partenaireAffectationService) {
        this.partenaireAffectationService = partenaireAffectationService;
    }

    @GetMapping
    public ResponseEntity<List<ReferentPartenaireResponse>> partenaires(Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.listerPartenairesReferent(auth.getName()));
    }

    @GetMapping("/impact")
    public ResponseEntity<Map<String, Object>> impact(Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.impactPartenairesReferent(auth.getName()));
    }

    @GetMapping("/{partenaireProfilId}")
    public ResponseEntity<ReferentPartenaireResponse> detail(
            @PathVariable Long partenaireProfilId,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.detailPartenaireReferent(
                partenaireProfilId,
                auth.getName()));
    }
}
