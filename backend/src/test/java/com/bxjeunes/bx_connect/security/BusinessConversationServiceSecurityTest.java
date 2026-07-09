package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.business.CreateBusinessConversationRequest;
import com.bxjeunes.bx_connect.dto.business.SendBusinessMessageRequest;
import com.bxjeunes.bx_connect.entity.BusinessConversation;
import com.bxjeunes.bx_connect.entity.BusinessConversationParticipant;
import com.bxjeunes.bx_connect.entity.BusinessConversationStatus;
import com.bxjeunes.bx_connect.entity.BusinessConversationType;
import com.bxjeunes.bx_connect.entity.BusinessMessage;
import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.BusinessConversationParticipantRepository;
import com.bxjeunes.bx_connect.repository.BusinessConversationRepository;
import com.bxjeunes.bx_connect.repository.BusinessMessageRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import com.bxjeunes.bx_connect.service.BusinessConversationService;
import com.bxjeunes.bx_connect.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessConversationServiceSecurityTest {

    @Mock private BusinessConversationRepository conversationRepository;
    @Mock private BusinessConversationParticipantRepository participantRepository;
    @Mock private BusinessMessageRepository messageRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private BusinessConversationService service;

    private User admin;
    private User superAdmin;
    private User membre;
    private User referentA;
    private User referentB;
    private User partenaireA;
    private User partenaireB;
    private BusinessConversation conversation;

    @BeforeEach
    void setUp() {
        admin = user(1L, "admin@test.be", Role.ADMIN);
        superAdmin = user(2L, "super@test.be", Role.SUPER_ADMIN);
        membre = user(3L, "membre@test.be", Role.MEMBRE);
        referentA = user(4L, "referent-a@test.be", Role.REFERENT);
        referentB = user(5L, "referent-b@test.be", Role.REFERENT);
        partenaireA = user(6L, "partenaire-a@test.be", Role.PARTENAIRE);
        partenaireB = user(7L, "partenaire-b@test.be", Role.PARTENAIRE);
        conversation = conversation(100L, BusinessConversationType.ADMIN_REFERENT, admin);
    }

    @Test
    @DisplayName("MEMBRE est refuse par le service")
    void membre_interdit() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> service.listerMesConversations(membre.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("reservee");
    }

    @Test
    @DisplayName("MEMBRE est refuse par la liste paginee")
    void membre_interdit_liste_pagee() {
        when(userRepository.findByEmail(membre.getEmail())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> service.listerMesConversationsPage(membre.getEmail(), 0, 20))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("reservee");
        verify(conversationRepository, never()).findVisibleForUser(any(), any(Pageable.class));
    }

    @Test
    @DisplayName("Liste paginee limitee a l'utilisateur participant")
    void liste_pagee_limitee_utilisateur_participant() {
        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(conversationRepository.findVisibleForUser(eq(referentA.getId()), any(Pageable.class)))
                .thenReturn(new PageImpl<>(
                        List.of(conversation),
                        org.springframework.data.domain.PageRequest.of(0, 100),
                        1));
        when(participantRepository.findByConversationIdAndUserId(100L, referentA.getId()))
                .thenReturn(Optional.of(participant(conversation, referentA)));
        when(participantRepository.findByConversationIdOrderByIdAsc(100L))
                .thenReturn(List.of(participant(conversation, admin), participant(conversation, referentA)));
        when(messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(messageRepository.countUnreadForParticipant(100L, referentA.getId(), null))
                .thenReturn(0L);

        var response = service.listerMesConversationsPage(referentA.getEmail(), -1, 500);

        assertThat(response.content()).hasSize(1);
        assertThat(response.page()).isZero();
        assertThat(response.size()).isEqualTo(100);
        verify(conversationRepository).findVisibleForUser(eq(referentA.getId()), any(Pageable.class));
        verify(conversationRepository, never()).findAll();
    }

    @Test
    @DisplayName("REFERENT ne voit pas une conversation d'un autre REFERENT")
    void referent_ne_voit_pas_conversation_autre_referent() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(participantRepository.findByConversationIdAndUserId(100L, referentB.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConversation(100L, referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("participant");
    }

    @Test
    @DisplayName("PARTENAIRE ne voit pas une conversation d'un autre PARTENAIRE")
    void partenaire_ne_voit_pas_conversation_autre_partenaire() {
        when(userRepository.findByEmail(partenaireB.getEmail())).thenReturn(Optional.of(partenaireB));
        when(participantRepository.findByConversationIdAndUserId(100L, partenaireB.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConversation(100L, partenaireB.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("participant");
    }

    @Test
    @DisplayName("ADMIN ne voit pas une conversation ou il n'est pas participant")
    void admin_ne_voit_pas_conversation_non_participant() {
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(participantRepository.findByConversationIdAndUserId(200L, admin.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConversation(200L, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("participant");
    }

    @Test
    @DisplayName("Creation ADMIN_REFERENT ajoute exactement admin et referent")
    void creation_admin_referent_ajoute_deux_participants() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(referentA.getId());

        stubCreation(admin, referentA, BusinessConversationType.ADMIN_REFERENT);

        service.creerConversationAdminReferent(request, admin.getEmail());

        ArgumentCaptor<Iterable<BusinessConversationParticipant>> captor =
                ArgumentCaptor.forClass(Iterable.class);
        verify(participantRepository).saveAll(captor.capture());
        List<BusinessConversationParticipant> participants = toList(captor.getValue());

        assertThat(participants).hasSize(2);
        assertThat(participants).extracting(p -> p.getUser().getRole())
                .containsExactlyInAnyOrder(Role.ADMIN, Role.REFERENT);
        assertThat(participants).extracting(p -> p.getUser().getId())
                .containsExactlyInAnyOrder(admin.getId(), referentA.getId());
    }

    @Test
    @DisplayName("Creation ADMIN_PARTENAIRE ajoute exactement super admin et partenaire")
    void creation_admin_partenaire_ajoute_deux_participants() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(partenaireA.getId());

        stubCreation(superAdmin, partenaireA, BusinessConversationType.ADMIN_PARTENAIRE);

        service.creerConversationAdminPartenaire(request, superAdmin.getEmail());

        ArgumentCaptor<Iterable<BusinessConversationParticipant>> captor =
                ArgumentCaptor.forClass(Iterable.class);
        verify(participantRepository).saveAll(captor.capture());
        List<BusinessConversationParticipant> participants = toList(captor.getValue());

        assertThat(participants).hasSize(2);
        assertThat(participants).extracting(p -> p.getUser().getRole())
                .containsExactlyInAnyOrder(Role.SUPER_ADMIN, Role.PARTENAIRE);
        assertThat(participants).extracting(p -> p.getUser().getId())
                .containsExactlyInAnyOrder(superAdmin.getId(), partenaireA.getId());
    }

    @Test
    @DisplayName("Impossible de creer admin-referent avec un PARTENAIRE")
    void admin_referent_refuse_partenaire() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(partenaireA.getId());

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(partenaireA.getId())).thenReturn(Optional.of(partenaireA));

        assertThatThrownBy(() -> service.creerConversationAdminReferent(request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Destinataire");
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Impossible de creer admin-partenaire avec un REFERENT")
    void admin_partenaire_refuse_referent() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(referentA.getId());

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(referentA.getId())).thenReturn(Optional.of(referentA));

        assertThatThrownBy(() -> service.creerConversationAdminPartenaire(request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Destinataire");
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Impossible de creer une conversation metier avec un MEMBRE")
    void conversation_metier_refuse_membre() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(membre.getId());

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.findById(membre.getId())).thenReturn(Optional.of(membre));

        assertThatThrownBy(() -> service.creerConversationAdminReferent(request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("Destinataire");
        verify(conversationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Non participant ne peut pas lire les messages")
    void non_participant_ne_lit_pas_messages() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(participantRepository.findByConversationIdAndUserId(100L, referentB.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listerMessages(100L, referentB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(messageRepository, never()).findByConversationIdOrderByCreatedAtAsc(100L);
    }

    @Test
    @DisplayName("Non participant ne peut pas lire les messages pagines")
    void non_participant_ne_lit_pas_messages_pages() {
        when(userRepository.findByEmail(referentB.getEmail())).thenReturn(Optional.of(referentB));
        when(participantRepository.findByConversationIdAndUserId(100L, referentB.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.listerMessagesPage(100L, referentB.getEmail(), 0, 50))
                .isInstanceOf(AccessDeniedException.class);
        verify(messageRepository, never()).findByConversationId(eq(100L), any(Pageable.class));
    }

    @Test
    @DisplayName("Messages metier pagines appliquent le tri DESC et la taille maximale")
    void messages_metier_pages_limitent_size() {
        BusinessConversationParticipant adminParticipant = participant(conversation, admin);
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(participantRepository.findByConversationIdAndUserId(100L, admin.getId()))
                .thenReturn(Optional.of(adminParticipant));
        when(messageRepository.findByConversationId(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        service.listerMessagesPage(100L, admin.getEmail(), -1, 500);

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(messageRepository).findByConversationId(eq(100L), captor.capture());
        assertThat(captor.getValue().getPageNumber()).isZero();
        assertThat(captor.getValue().getPageSize()).isEqualTo(100);
        assertThat(captor.getValue().getSort().getOrderFor("createdAt").isDescending()).isTrue();
    }

    @Test
    @DisplayName("Non participant ne peut pas envoyer de message")
    void non_participant_necrit_pas() {
        SendBusinessMessageRequest request = new SendBusinessMessageRequest();
        request.setContenu("Bonjour");

        when(userRepository.findByEmail(partenaireB.getEmail())).thenReturn(Optional.of(partenaireB));
        when(participantRepository.findByConversationIdAndUserId(100L, partenaireB.getId()))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.envoyerMessage(100L, request, partenaireB.getEmail()))
                .isInstanceOf(AccessDeniedException.class);
        verify(messageRepository, never()).save(any());
    }

    @Test
    @DisplayName("Impossible d'envoyer un message dans une conversation ARCHIVED")
    void conversation_archivee_refuse_envoi_message() {
        conversation.setStatus(BusinessConversationStatus.ARCHIVED);
        BusinessConversationParticipant adminParticipant = participant(conversation, admin);
        SendBusinessMessageRequest request = new SendBusinessMessageRequest();
        request.setContenu("Message apres archivage");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(participantRepository.findByConversationIdAndUserId(100L, admin.getId()))
                .thenReturn(Optional.of(adminParticipant));

        assertThatThrownBy(() -> service.envoyerMessage(100L, request, admin.getEmail()))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("archivee");
        verify(messageRepository, never()).save(any());
    }

    @Test
    @DisplayName("lastReadAt ne modifie que le participant courant")
    void last_read_at_modifie_participant_courant_uniquement() {
        BusinessConversationParticipant adminParticipant = participant(conversation, admin);
        BusinessConversationParticipant referentParticipant = participant(conversation, referentA);

        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(participantRepository.findByConversationIdAndUserId(100L, referentA.getId()))
                .thenReturn(Optional.of(referentParticipant));
        when(participantRepository.findByConversationIdOrderByIdAsc(100L))
                .thenReturn(List.of(adminParticipant, referentParticipant));
        when(messageRepository.countUnreadForParticipant(eq(100L), eq(referentA.getId()), any()))
                .thenReturn(0L);
        when(messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());

        service.marquerLu(100L, referentA.getEmail());

        verify(participantRepository).save(referentParticipant);
        assertThat(referentParticipant.getLastReadAt()).isNotNull();
        assertThat(adminParticipant.getLastReadAt()).isNull();
    }

    @Test
    @DisplayName("lastReadAt fonctionne dans une conversation ARCHIVED")
    void last_read_at_fonctionne_conversation_archivee() {
        conversation.setStatus(BusinessConversationStatus.ARCHIVED);
        BusinessConversationParticipant adminParticipant = participant(conversation, admin);
        BusinessConversationParticipant referentParticipant = participant(conversation, referentA);

        when(userRepository.findByEmail(referentA.getEmail())).thenReturn(Optional.of(referentA));
        when(participantRepository.findByConversationIdAndUserId(100L, referentA.getId()))
                .thenReturn(Optional.of(referentParticipant));
        when(participantRepository.findByConversationIdOrderByIdAsc(100L))
                .thenReturn(List.of(adminParticipant, referentParticipant));
        when(messageRepository.countUnreadForParticipant(eq(100L), eq(referentA.getId()), any()))
                .thenReturn(0L);
        when(messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());

        service.marquerLu(100L, referentA.getEmail());

        verify(participantRepository).save(referentParticipant);
        assertThat(referentParticipant.getLastReadAt()).isNotNull();
    }

    @Test
    @DisplayName("Notification envoyee seulement aux autres participants")
    void notification_message_seulement_autres_participants() {
        BusinessConversationParticipant adminParticipant = participant(conversation, admin);
        BusinessConversationParticipant referentParticipant = participant(conversation, referentA);
        SendBusinessMessageRequest request = new SendBusinessMessageRequest();
        request.setContenu("Bonjour referent");

        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));
        when(participantRepository.findByConversationIdAndUserId(100L, admin.getId()))
                .thenReturn(Optional.of(adminParticipant));
        when(messageRepository.save(any(BusinessMessage.class))).thenAnswer(inv -> {
            BusinessMessage message = inv.getArgument(0);
            message.setId(500L);
            message.setCreatedAt(java.time.LocalDateTime.now());
            return message;
        });
        when(participantRepository.findByConversationIdOrderByIdAsc(100L))
                .thenReturn(List.of(adminParticipant, referentParticipant));

        service.envoyerMessage(100L, request, admin.getEmail());

        verify(notificationService, times(1)).creer(
                eq(referentA),
                eq("Nouveau message"),
                any(),
                eq("BUSINESS_MESSAGE"),
                eq("/conversations-metier/100")
        );
        verify(notificationService, never()).creer(
                eq(admin),
                any(),
                any(),
                any(),
                any()
        );
    }

    @Test
    @DisplayName("Message initial ne cree pas de double notification")
    void message_initial_ne_cree_pas_double_notification() {
        CreateBusinessConversationRequest request = new CreateBusinessConversationRequest();
        request.setDestinataireId(referentA.getId());
        request.setMessageInitial("Bonjour pour commencer.");

        stubCreation(admin, referentA, BusinessConversationType.ADMIN_REFERENT);
        when(messageRepository.save(any(BusinessMessage.class))).thenAnswer(inv -> {
            BusinessMessage message = inv.getArgument(0);
            message.setId(501L);
            message.setCreatedAt(java.time.LocalDateTime.now());
            return message;
        });

        service.creerConversationAdminReferent(request, admin.getEmail());

        verify(notificationService, times(1)).creer(
                eq(referentA),
                eq("Nouvelle conversation"),
                any(),
                eq("BUSINESS_CONVERSATION_CREATED"),
                eq("/conversations-metier/100")
        );
        verify(notificationService, never()).creer(
                eq(referentA),
                eq("Nouveau message"),
                any(),
                eq("BUSINESS_MESSAGE"),
                eq("/conversations-metier/100")
        );
    }

    private void stubCreation(User createur, User destinataire, BusinessConversationType type) {
        BusinessConversation saved = conversation(100L, type, createur);
        BusinessConversationParticipant createurParticipant = participant(saved, createur);
        BusinessConversationParticipant destinataireParticipant = participant(saved, destinataire);

        when(userRepository.findByEmail(createur.getEmail())).thenReturn(Optional.of(createur));
        when(userRepository.findById(destinataire.getId())).thenReturn(Optional.of(destinataire));
        when(conversationRepository.save(any(BusinessConversation.class))).thenAnswer(inv -> {
            BusinessConversation c = inv.getArgument(0);
            c.setId(100L);
            return c;
        });
        when(participantRepository.findByConversationIdAndUserId(100L, createur.getId()))
                .thenReturn(Optional.of(createurParticipant));
        when(participantRepository.findByConversationIdOrderByIdAsc(100L))
                .thenReturn(List.of(createurParticipant, destinataireParticipant));
        when(messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(100L))
                .thenReturn(Optional.empty());
        when(messageRepository.countUnreadForParticipant(100L, createur.getId(), null))
                .thenReturn(0L);
    }

    private BusinessConversation conversation(Long id, BusinessConversationType type, User createur) {
        BusinessConversation conversation = new BusinessConversation();
        conversation.setId(id);
        conversation.setTitre("Conversation");
        conversation.setType(type);
        conversation.setCreatedBy(createur);
        return conversation;
    }

    private BusinessConversationParticipant participant(BusinessConversation conversation, User user) {
        BusinessConversationParticipant participant = new BusinessConversationParticipant();
        participant.setConversation(conversation);
        participant.setUser(user);
        participant.setRoleSnapshot(user.getRole());
        return participant;
    }

    private User user(Long id, String email, Role role) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPrenom("Test");
        user.setNom("User");
        user.setRole(role);
        user.setActif(true);
        return user;
    }

    private List<BusinessConversationParticipant> toList(Iterable<BusinessConversationParticipant> participants) {
        return java.util.stream.StreamSupport.stream(participants.spliterator(), false).toList();
    }
}
