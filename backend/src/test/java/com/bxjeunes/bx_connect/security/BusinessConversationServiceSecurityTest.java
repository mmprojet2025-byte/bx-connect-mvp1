package com.bxjeunes.bx_connect.security;

import com.bxjeunes.bx_connect.dto.business.CreateBusinessConversationRequest;
import com.bxjeunes.bx_connect.dto.business.SendBusinessMessageRequest;
import com.bxjeunes.bx_connect.entity.BusinessConversation;
import com.bxjeunes.bx_connect.entity.BusinessConversationParticipant;
import com.bxjeunes.bx_connect.entity.BusinessConversationType;
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
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
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
