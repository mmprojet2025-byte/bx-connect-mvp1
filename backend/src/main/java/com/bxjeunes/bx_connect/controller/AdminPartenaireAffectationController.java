package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PartenaireAffectationRequest;
import com.bxjeunes.bx_connect.dto.PartenaireGroupeResponse;
import com.bxjeunes.bx_connect.dto.PartenaireReferentResponse;
import com.bxjeunes.bx_connect.service.PartenaireAffectationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/partenaires")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPartenaireAffectationController {

    private final PartenaireAffectationService partenaireAffectationService;

    public AdminPartenaireAffectationController(PartenaireAffectationService partenaireAffectationService) {
        this.partenaireAffectationService = partenaireAffectationService;
    }

    @GetMapping("/affectations")
    public ResponseEntity<Map<String, Object>> affectations() {
        return ResponseEntity.ok(partenaireAffectationService.listerToutesLesAffectationsAdmin());
    }

    @PostMapping("/{partenaireProfilId}/referents/{referentId}")
    public ResponseEntity<PartenaireReferentResponse> affecterReferent(
            @PathVariable Long partenaireProfilId,
            @PathVariable Long referentId,
            @RequestBody(required = false) PartenaireAffectationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.affecterPartenaireAReferent(
                partenaireProfilId,
                referentId,
                request,
                auth.getName()));
    }

    @PatchMapping("/referents/{affectationId}")
    public ResponseEntity<PartenaireReferentResponse> modifierReferent(
            @PathVariable Long affectationId,
            @RequestBody(required = false) PartenaireAffectationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.modifierAffectationReferent(
                affectationId,
                request,
                auth.getName()));
    }

    @PatchMapping("/referents/{affectationId}/desactiver")
    public ResponseEntity<PartenaireReferentResponse> desactiverReferent(
            @PathVariable Long affectationId,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.desactiverAffectationReferent(
                affectationId,
                auth.getName()));
    }

    @PostMapping("/{partenaireProfilId}/groupes/{groupeId}")
    public ResponseEntity<PartenaireGroupeResponse> affecterGroupe(
            @PathVariable Long partenaireProfilId,
            @PathVariable Long groupeId,
            @RequestBody(required = false) PartenaireAffectationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.affecterPartenaireAGroupe(
                partenaireProfilId,
                groupeId,
                request,
                auth.getName()));
    }

    @PatchMapping("/groupes/{affectationId}")
    public ResponseEntity<PartenaireGroupeResponse> modifierGroupe(
            @PathVariable Long affectationId,
            @RequestBody(required = false) PartenaireAffectationRequest request,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.modifierAffectationGroupe(
                affectationId,
                request,
                auth.getName()));
    }

    @PatchMapping("/groupes/{affectationId}/desactiver")
    public ResponseEntity<PartenaireGroupeResponse> desactiverGroupe(
            @PathVariable Long affectationId,
            Authentication auth) {
        return ResponseEntity.ok(partenaireAffectationService.desactiverAffectationGroupe(
                affectationId,
                auth.getName()));
    }
}
