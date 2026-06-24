package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.InscriptionRequest;
import com.bxjeunes.bx_connect.dto.MessageRequest;
import com.bxjeunes.bx_connect.entity.Activite;
import com.bxjeunes.bx_connect.entity.FilDiscussion;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.Inscription;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.Message;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutActivite;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.ActiviteRepository;
import com.bxjeunes.bx_connect.repository.FilDiscussionRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.InscriptionRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.MessageRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PushWorkflowNotificationTest {

    @Mock private ActiviteRepository activiteRepository;
    @Mock private InscriptionRepository inscriptionRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private AuditLogService auditLogService;
    @Mock private FilDiscussionRepository filRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;

    @Test
    void publier_une_activite_notifie_les_membres_actifs() {
        User admin = user(1L, "admin@test.be", Role.ADMIN);
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        Activite activite = activite(8L, admin, true);

        when(activiteRepository.findById(8L)).thenReturn(Optional.of(activite));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(activiteRepository.save(activite)).thenReturn(activite);
        when(userRepository.findByRoleAndActifTrue(Role.MEMBRE)).thenReturn(List.of(membre));
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);

        new ActiviteService(
                activiteRepository,
                userRepository,
                inscriptionRepository,
                notificationService,
                auditLogService
        ).changerStatut(8L, StatutActivite.PUBLIEE, admin.getEmail());

        verify(notificationService).creer(
                membre,
                "Nouvelle activité publiée",
                "Atelier est maintenant disponible.",
                "ACTIVITE_PUBLIEE",
                "/activites/8"
        );
    }

    @Test
    void une_inscription_gratuite_confirmee_notifie_le_membre() {
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        Activite activite = activite(8L, user(1L, "admin@test.be", Role.ADMIN), true);
        activite.setStatut(StatutActivite.PUBLIEE);
        InscriptionRequest request = new InscriptionRequest();
        request.setActiviteId(8L);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(activiteRepository.findById(8L)).thenReturn(Optional.of(activite));
        when(inscriptionRepository.findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(2L, 8L)).thenReturn(List.of());
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);
        when(inscriptionRepository.save(any(Inscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        new InscriptionService(
                inscriptionRepository,
                activiteRepository,
                userRepository,
                notificationService,
                auditLogService
        ).inscrire(request, membre.getEmail());

        verify(notificationService).creer(
                membre,
                "Inscription confirmée",
                "Votre inscription à Atelier est confirmée.",
                "INSCRIPTION_CONFIRMEE",
                "/activites/8"
        );
    }

    @Test
    void une_inscription_payante_non_confirmee_ne_declenche_pas_la_confirmation() {
        User membre = user(2L, "membre@test.be", Role.MEMBRE);
        Activite activite = activite(8L, user(1L, "admin@test.be", Role.ADMIN), false);
        activite.setStatut(StatutActivite.PUBLIEE);
        activite.setGratuite(false);
        InscriptionRequest request = new InscriptionRequest();
        request.setActiviteId(8L);

        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));
        when(activiteRepository.findById(8L)).thenReturn(Optional.of(activite));
        when(inscriptionRepository.findByMembreIdAndActiviteIdOrderByDateInscriptionDesc(2L, 8L)).thenReturn(List.of());
        when(inscriptionRepository.countByActiviteIdAndStatutIn(any(), any())).thenReturn(0L);
        when(inscriptionRepository.save(any(Inscription.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        new InscriptionService(
                inscriptionRepository,
                activiteRepository,
                userRepository,
                notificationService,
                auditLogService
        ).inscrire(request, membre.getEmail());

        verify(notificationService, never()).creer(
                any(User.class),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    void un_message_notifie_les_autres_membres_et_le_referent() {
        User auteur = user(2L, "auteur@test.be", Role.MEMBRE);
        User autreMembre = user(3L, "autre@test.be", Role.MEMBRE);
        User referent = user(4L, "referent@test.be", Role.REFERENT);
        Groupe groupe = groupe(10L, referent);
        FilDiscussion fil = new FilDiscussion();
        fil.setId(20L);
        fil.setGroupe(groupe);
        fil.setActif(true);

        when(userRepository.findByEmail(auteur.getEmail())).thenReturn(Optional.of(auteur));
        when(filRepository.findById(20L)).thenReturn(Optional.of(fil));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupe));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(2L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(auteur, groupe)));
        when(messageRepository.save(any(Message.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(membreGroupeRepository.findByGroupeIdAndStatut(10L, StatutMembre.ACCEPTE))
                .thenReturn(List.of(adhesion(auteur, groupe), adhesion(autreMembre, groupe)));

        MessageRequest request = new MessageRequest();
        request.setFilId(20L);
        request.setContenu("Bonjour");

        new MessagerieService(
                filRepository,
                messageRepository,
                userRepository,
                groupeRepository,
                membreGroupeRepository,
                notificationService
        ).envoyerMessage(request, auteur.getEmail());

        verify(notificationService).creer(
                autreMembre,
                "Nouveau message",
                "Test a envoyé un message dans Groupe test.",
                "MESSAGE",
                "/messagerie"
        );
        verify(notificationService).creer(
                referent,
                "Nouveau message",
                "Test a envoyé un message dans Groupe test.",
                "MESSAGE",
                "/messagerie"
        );
        verify(notificationService, never()).creer(
                auteur,
                "Nouveau message",
                "Test a envoyé un message dans Groupe test.",
                "MESSAGE",
                "/messagerie"
        );
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setPrenom("Test");
        user.setNom("User");
        user.setEmail(email);
        user.setRole(role);
        user.setActif(true);
        user.setMotDePasse("secret");
        return user;
    }

    private Activite activite(Long id, User createur, boolean gratuite) {
        Activite activite = new Activite();
        activite.setId(id);
        activite.setTitre("Atelier");
        activite.setDescription("Description");
        activite.setLieu("Bruxelles");
        activite.setStatut(StatutActivite.BROUILLON);
        activite.setCreateur(createur);
        activite.setGratuite(gratuite);
        activite.setCapaciteMax(20);
        return activite;
    }

    private Groupe groupe(Long id, User referent) {
        Groupe groupe = new Groupe();
        groupe.setId(id);
        groupe.setNom("Groupe test");
        groupe.setReferent(referent);
        groupe.setActif(true);
        return groupe;
    }

    private MembreGroupe adhesion(User user, Groupe groupe) {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(user);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);
        return adhesion;
    }
}
