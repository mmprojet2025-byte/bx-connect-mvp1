package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.MessageRequest;
import com.bxjeunes.bx_connect.entity.FilDiscussion;
import com.bxjeunes.bx_connect.entity.Groupe;
import com.bxjeunes.bx_connect.entity.MembreGroupe;
import com.bxjeunes.bx_connect.entity.Message;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.StatutMembre;
import com.bxjeunes.bx_connect.entity.TypeFil;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.FilDiscussionRepository;
import com.bxjeunes.bx_connect.repository.GroupeRepository;
import com.bxjeunes.bx_connect.repository.MembreGroupeRepository;
import com.bxjeunes.bx_connect.repository.MessageRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.MessagerieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessagerieSecurityTest {

    @Mock private FilDiscussionRepository filRepository;
    @Mock private MessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private MembreGroupeRepository membreGroupeRepository;

    @InjectMocks
    private MessagerieService messagerieService;

    private User membreA;
    private User membreSansGroupe;
    private User referentA;
    private User referentB;
    private User admin;
    private User superAdmin;
    private Groupe groupeA;
    private Groupe groupeB;
    private FilDiscussion filA;
    private FilDiscussion filB;

    @BeforeEach
    void setUp() {
        membreA = user(1L, "membre-a@test.be", Role.MEMBRE);
        membreSansGroupe = user(2L, "sans-groupe@test.be", Role.MEMBRE);
        referentA = user(3L, "referent-a@test.be", Role.REFERENT);
        referentB = user(4L, "referent-b@test.be", Role.REFERENT);
        admin = user(5L, "admin@test.be", Role.ADMIN);
        superAdmin = user(6L, "super@test.be", Role.SUPER_ADMIN);

        groupeA = groupe(10L, "Groupe A", referentA);
        groupeB = groupe(20L, "Groupe B", referentB);
        filA = fil(100L, groupeA, referentA);
        filB = fil(200L, groupeB, referentB);
    }

    @Test
    @DisplayName("Un membre du groupe A ne peut pas lire les messages du groupe B")
    void membre_groupe_a_ne_lit_pas_groupe_b() {
        when(userRepository.findByEmail(membreA.getEmail())).thenReturn(Optional.of(membreA));
        when(filRepository.findById(200L)).thenReturn(Optional.of(filB));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(1L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membreA, groupeA)));

        assertThatThrownBy(() -> messagerieService.listerMessages(200L, membreA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("pas acces");
    }

    @Test
    @DisplayName("Un referent du groupe A ne peut pas lire les messages du groupe B")
    void referent_groupe_a_ne_lit_pas_groupe_b() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(filRepository.findById(200L)).thenReturn(Optional.of(filB));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));

        assertThatThrownBy(() -> messagerieService.listerMessages(200L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("referent");
    }

    @Test
    @DisplayName("ADMIN n'a aucun acces aux messages des groupes")
    void admin_recoit_403() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(filRepository.findById(100L)).thenReturn(Optional.of(filA));

        assertThatThrownBy(() -> messagerieService.listerMessages(100L, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("ADMIN");
    }

    @Test
    @DisplayName("SUPER_ADMIN n'a aucun acces aux messages des groupes")
    void super_admin_recoit_403() {
        when(userRepository.findByEmail(superAdmin.getEmail())).thenReturn(Optional.of(superAdmin));
        when(filRepository.findById(100L)).thenReturn(Optional.of(filA));

        assertThatThrownBy(() -> messagerieService.listerMessages(100L, superAdmin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("SUPER_ADMIN");
    }

    @Test
    @DisplayName("Un membre sans groupe actif voit une liste de fils vide")
    void membre_sans_groupe_liste_vide() {
        when(userRepository.findByEmail(membreSansGroupe.getEmail())).thenReturn(Optional.of(membreSansGroupe));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(2L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.empty());

        assertThat(messagerieService.listerTousLesFils(membreSansGroupe.getEmail())).isEmpty();
    }

    @Test
    @DisplayName("Un membre accepte peut lire les messages de son groupe")
    void membre_accepte_peut_lire_son_groupe() {
        Message message = new Message();
        message.setId(500L);
        message.setContenu("Bonjour");
        message.setAuteur(membreA);
        message.setFil(filA);

        when(userRepository.findByEmail(membreA.getEmail())).thenReturn(Optional.of(membreA));
        when(filRepository.findById(100L)).thenReturn(Optional.of(filA));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(1L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membreA, groupeA)));
        when(messageRepository.findByFilIdOrderByDateEnvoiAsc(100L)).thenReturn(List.of(message));

        assertThat(messagerieService.listerMessages(100L, membreA.getEmail())).hasSize(1);
    }

    @Test
    @DisplayName("Un membre accepte peut ecrire dans la messagerie de son groupe")
    void membre_accepte_peut_ecrire_son_groupe() {
        when(userRepository.findByEmail(membreA.getEmail())).thenReturn(Optional.of(membreA));
        when(filRepository.findById(100L)).thenReturn(Optional.of(filA));
        when(groupeRepository.findById(10L)).thenReturn(Optional.of(groupeA));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(1L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membreA, groupeA)));
        when(messageRepository.save(any(Message.class))).thenAnswer(inv -> inv.getArgument(0));

        MessageRequest request = new MessageRequest();
        request.setFilId(100L);
        request.setContenu("Bonjour groupe A");

        assertThat(messagerieService.envoyerMessage(request, membreA.getEmail()).getContenu())
                .isEqualTo("Bonjour groupe A");
    }

    @Test
    @DisplayName("Un membre ne peut pas marquer comme lu un message d'un autre groupe")
    void membre_ne_marque_pas_lu_message_autre_groupe() {
        Message message = message(600L, "Message groupe B", membreA, filB);

        when(messageRepository.findById(600L)).thenReturn(Optional.of(message));
        when(filRepository.findById(200L)).thenReturn(Optional.of(filB));
        when(userRepository.findByEmail(membreA.getEmail())).thenReturn(Optional.of(membreA));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(1L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membreA, groupeA)));

        assertThatThrownBy(() -> messagerieService.marquerCommeLu(600L, membreA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("pas acces");
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    @DisplayName("Un referent ne peut pas marquer comme lu un message d'un autre groupe")
    void referent_ne_marque_pas_lu_message_autre_groupe() {
        Message message = message(600L, "Message groupe B", membreA, filB);

        when(messageRepository.findById(600L)).thenReturn(Optional.of(message));
        when(filRepository.findById(200L)).thenReturn(Optional.of(filB));
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));

        assertThatThrownBy(() -> messagerieService.marquerCommeLu(600L, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("referent");
        verify(messageRepository, never()).save(any(Message.class));
    }

    @Test
    @DisplayName("Un membre ne peut pas consulter les non-lus d'un autre groupe")
    void membre_ne_consulte_pas_non_lus_autre_groupe() {
        when(userRepository.findByEmail(membreA.getEmail())).thenReturn(Optional.of(membreA));
        when(filRepository.findById(200L)).thenReturn(Optional.of(filB));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));
        when(membreGroupeRepository.findFirstByUserIdAndStatut(1L, StatutMembre.ACCEPTE))
                .thenReturn(Optional.of(adhesion(membreA, groupeA)));

        assertThatThrownBy(() -> messagerieService.compterMessagesNonLus(200L, membreA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("pas acces");
    }

    @Test
    @DisplayName("Un referent ne peut pas creer un fil pour un groupe d'autrui")
    void referent_ne_cree_pas_fil_groupe_autrui() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(groupeRepository.findById(20L)).thenReturn(Optional.of(groupeB));

        com.bxjeunes.bx_connect.dto.FilDiscussionRequest request =
                new com.bxjeunes.bx_connect.dto.FilDiscussionRequest();
        request.setTitre("Discussion interdite");
        request.setGroupeId(20L);

        assertThatThrownBy(() -> messagerieService.creerFil(request, referentA.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("referent");
        verify(filRepository, never()).save(any(FilDiscussion.class));
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        user.setActif(true);
        user.setMotDePasse("secret");
        return user;
    }

    private Groupe groupe(Long id, String nom, User referent) {
        Groupe groupe = new Groupe();
        groupe.setId(id);
        groupe.setNom(nom);
        groupe.setReferent(referent);
        groupe.setActif(true);
        return groupe;
    }

    private FilDiscussion fil(Long id, Groupe groupe, User createur) {
        FilDiscussion fil = new FilDiscussion();
        fil.setId(id);
        fil.setTitre("Discussion " + groupe.getNom());
        fil.setType(TypeFil.GENERAL);
        fil.setGroupe(groupe);
        fil.setCreateur(createur);
        fil.setActif(true);
        return fil;
    }

    private MembreGroupe adhesion(User user, Groupe groupe) {
        MembreGroupe adhesion = new MembreGroupe();
        adhesion.setUser(user);
        adhesion.setGroupe(groupe);
        adhesion.setStatut(StatutMembre.ACCEPTE);
        return adhesion;
    }

    private Message message(Long id, String contenu, User auteur, FilDiscussion fil) {
        Message message = new Message();
        message.setId(id);
        message.setContenu(contenu);
        message.setAuteur(auteur);
        message.setFil(fil);
        return message;
    }
}
