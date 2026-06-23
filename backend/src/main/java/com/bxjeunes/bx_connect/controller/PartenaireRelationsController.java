package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PartenaireGroupeResponse;
import com.bxjeunes.bx_connect.dto.PartenaireReferentResponse;
import com.bxjeunes.bx_connect.service.PartenaireAffectationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/partenaire")
@PreAuthorize("hasRole('PARTENAIRE')")
public class PartenaireRelationsController {

    private final PartenaireAffectationService partenaireAffectationService;

    public PartenaireRelationsController(PartenaireAffectationService partenaireAffectationService) {
        this.partenaireAffectationService = partenaireAffectationService;
    }

    @GetMapping("/mes-referents")
    public ResponseEntity<List<PartenaireReferentResponse>> mesReferents(Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.listerReferentsPartenaire(auth.getName()));
    }

    @GetMapping("/mes-groupes-lies")
    public ResponseEntity<List<PartenaireGroupeResponse>> mesGroupesLies(Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.listerGroupesPartenaire(auth.getName()));
    }

    @GetMapping("/impact-local")
    public ResponseEntity<Map<String, Object>> impactLocal(Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.impactLocalPartenaire(auth.getName()));
    }
}
