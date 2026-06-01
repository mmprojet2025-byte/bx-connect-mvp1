package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.admin.CreateReferentRequest;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.AdminReferentService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminReferentServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminReferentService adminReferentService;

    @Test
    @DisplayName("ADMIN cree un compte REFERENT")
    void admin_cree_compte_referent() {
        when(userRepository.existsByEmail("ref@test.be")).thenReturn(false);
        when(passwordEncoder.encode("Temp12345!")).thenReturn("$2a$hash");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateReferentRequest request = new CreateReferentRequest();
        request.setPrenom("Ref");
        request.setNom("Creatif");
        request.setEmail("ref@test.be");
        request.setMotDePasseTemporaire("Temp12345!");

        adminReferentService.creerReferent(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo(Role.REFERENT);
        assertThat(captor.getValue().isActif()).isTrue();
        assertThat(captor.getValue().getMotDePasse()).isEqualTo("$2a$hash");
    }

    @Test
    @DisplayName("ADMIN peut nommer un MEMBRE comme REFERENT")
    void admin_nomme_membre_comme_referent() {
        User membre = user(4L, Role.MEMBRE);
        when(userRepository.findById(4L)).thenReturn(Optional.of(membre));
        when(userRepository.save(membre)).thenReturn(membre);

        adminReferentService.nommerReferent(4L);

        assertThat(membre.getRole()).isEqualTo(Role.REFERENT);
    }

    @Test
    @DisplayName("ADMIN ne peut pas nommer un SUPER_ADMIN comme REFERENT")
    void admin_ne_peut_pas_nommer_super_admin_comme_referent() {
        User superAdmin = user(1L, Role.SUPER_ADMIN);
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));

        assertThatThrownBy(() -> adminReferentService.nommerReferent(1L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("ADMIN ne peut pas nommer un ADMIN comme REFERENT")
    void admin_ne_peut_pas_nommer_admin_comme_referent() {
        User admin = user(2L, Role.ADMIN);
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> adminReferentService.nommerReferent(2L))
                .isInstanceOf(AccessDeniedException.class);

        verify(userRepository, never()).save(any(User.class));
    }

    private User user(Long id, Role role) {
        User user = new User();
        user.setId(id);
        user.setPrenom("Test");
        user.setNom("User");
        user.setEmail("test" + id + "@test.be");
        user.setRole(role);
        user.setActif(true);
        return user;
    }
}
