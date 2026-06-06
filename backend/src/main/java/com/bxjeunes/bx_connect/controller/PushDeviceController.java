package com.bxjeunes.bx_connect.controller;

import com.bxjeunes.bx_connect.dto.PushDeviceRequest;
import com.bxjeunes.bx_connect.dto.PushPreferenceRequest;
import com.bxjeunes.bx_connect.dto.PushPreferenceResponse;
import com.bxjeunes.bx_connect.service.PushDeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/push")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class PushDeviceController {

    private final PushDeviceService pushDeviceService;

    @PostMapping("/devices")
    public ResponseEntity<PushPreferenceResponse> enregistrerAppareil(
            @Valid @RequestBody PushDeviceRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                pushDeviceService.enregistrerAppareil(authentication.getName(), request));
    }

    @DeleteMapping("/devices/{token:.+}")
    public ResponseEntity<Void> supprimerAppareil(
            @PathVariable String token,
            Authentication authentication
    ) {
        pushDeviceService.supprimerAppareil(authentication.getName(), token);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<PushPreferenceResponse> getPreferences(Authentication authentication) {
        return ResponseEntity.ok(
                pushDeviceService.getPreferences(authentication.getName()));
    }

    @PutMapping("/preferences")
    public ResponseEntity<PushPreferenceResponse> mettreAJourPreferences(
            @Valid @RequestBody PushPreferenceRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                pushDeviceService.mettreAJourPreferences(
                        authentication.getName(),
                        request.getEnabled()
                )
        );
    }
}
