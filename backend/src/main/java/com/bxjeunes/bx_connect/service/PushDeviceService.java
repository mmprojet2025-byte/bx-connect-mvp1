package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PushDeviceRequest;
import com.bxjeunes.bx_connect.dto.PushPreferenceResponse;
import com.bxjeunes.bx_connect.entity.PushDevice;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.PushDeviceRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PushDeviceService {

    private final PushDeviceRepository pushDeviceRepository;
    private final UserRepository userRepository;

    @Transactional
    public PushPreferenceResponse enregistrerAppareil(String email, PushDeviceRequest request) {
        User user = getUser(email);
        PushDevice device = pushDeviceRepository.findByExpoPushToken(request.getExpoPushToken())
                .map(existing -> {
                    if (!existing.getUser().getId().equals(user.getId())) {
                        throw new AccessDeniedException(
                                "Ce token push est deja associe a un autre utilisateur.");
                    }
                    return existing;
                })
                .orElseGet(() -> PushDevice.builder()
                        .user(user)
                        .expoPushToken(request.getExpoPushToken())
                        .build());

        device.setPlatform(request.getPlatform().toLowerCase(Locale.ROOT));
        device.setDeviceId(normalize(request.getDeviceId()));
        device.setEnabled(request.isEnabled());
        pushDeviceRepository.save(device);

        return getPreferences(user);
    }

    @Transactional
    public void supprimerAppareil(String email, String token) {
        User user = getUser(email);
        pushDeviceRepository.findByExpoPushTokenAndUserId(token, user.getId())
                .orElseThrow(() -> new AccessDeniedException(
                        "Vous ne pouvez supprimer que vos propres appareils push."));
        pushDeviceRepository.deleteByExpoPushTokenAndUserId(token, user.getId());
    }

    public PushPreferenceResponse getPreferences(String email) {
        return getPreferences(getUser(email));
    }

    @Transactional
    public PushPreferenceResponse mettreAJourPreferences(String email, boolean enabled) {
        User user = getUser(email);
        pushDeviceRepository.findByUserId(user.getId()).forEach(device -> {
            device.setEnabled(enabled);
            pushDeviceRepository.save(device);
        });
        return getPreferences(user);
    }

    private PushPreferenceResponse getPreferences(User user) {
        long registeredDevices = pushDeviceRepository.countByUserId(user.getId());
        long enabledDevices = pushDeviceRepository.countByUserIdAndEnabledTrue(user.getId());
        return new PushPreferenceResponse(
                registeredDevices > 0 && enabledDevices > 0,
                registeredDevices,
                enabledDevices
        );
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
