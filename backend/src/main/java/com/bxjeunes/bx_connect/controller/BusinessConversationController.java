package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.dto.business.BusinessConversationResponse;
import com.bxjeunes.bx_connect.dto.business.BusinessMessageResponse;
import com.bxjeunes.bx_connect.dto.business.CreateBusinessConversationRequest;
import com.bxjeunes.bx_connect.dto.business.SendBusinessMessageRequest;
import com.bxjeunes.bx_connect.service.BusinessConversationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations-metier")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'REFERENT', 'PARTENAIRE')")
public class BusinessConversationController {

    private final BusinessConversationService businessConversationService;

    public BusinessConversationController(BusinessConversationService businessConversationService) {
        this.businessConversationService = businessConversationService;
    }

    @GetMapping
    public ResponseEntity<List<BusinessConversationResponse>> lister(Authentication authentication) {
        return ResponseEntity.ok(
                businessConversationService.listerMesConversations(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusinessConversationResponse> detail(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                businessConversationService.getConversation(id, authentication.getName()));
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<BusinessMessageResponse>> messages(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                businessConversationService.listerMessages(id, authentication.getName()));
    }

    @GetMapping("/{id}/messages/page")
    public ResponseEntity<PagedResponse<BusinessMessageResponse>> messagesPage(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                businessConversationService.listerMessagesPage(id, authentication.getName(), page, size));
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<BusinessMessageResponse> envoyer(
            @PathVariable Long id,
            @Valid @RequestBody SendBusinessMessageRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessConversationService.envoyerMessage(id, request, authentication.getName()));
    }

    @PatchMapping("/{id}/lu")
    public ResponseEntity<BusinessConversationResponse> marquerLu(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                businessConversationService.marquerLu(id, authentication.getName()));
    }

    @PostMapping("/admin-referent")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BusinessConversationResponse> creerAdminReferent(
            @Valid @RequestBody CreateBusinessConversationRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessConversationService.creerConversationAdminReferent(
                        request,
                        authentication.getName()
                ));
    }

    @PostMapping("/admin-partenaire")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<BusinessConversationResponse> creerAdminPartenaire(
            @Valid @RequestBody CreateBusinessConversationRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(businessConversationService.creerConversationAdminPartenaire(
                        request,
                        authentication.getName()
                ));
    }
}
