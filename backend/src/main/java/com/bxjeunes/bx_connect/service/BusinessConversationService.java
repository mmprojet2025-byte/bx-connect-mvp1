package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.PagedResponse;
import com.bxjeunes.bx_connect.dto.business.BusinessConversationResponse;
import com.bxjeunes.bx_connect.dto.business.BusinessMessageResponse;
import com.bxjeunes.bx_connect.dto.business.CreateBusinessConversationRequest;
import com.bxjeunes.bx_connect.dto.business.SendBusinessMessageRequest;
import com.bxjeunes.bx_connect.entity.BusinessConversation;
import com.bxjeunes.bx_connect.entity.BusinessConversationContextType;
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
import com.bxjeunes.bx_connect.util.PaginationUtils;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BusinessConversationService {

    private static final String ACTION_PREFIX = "/conversations-metier/";

    private final BusinessConversationRepository conversationRepository;
    private final BusinessConversationParticipantRepository participantRepository;
    private final BusinessMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public BusinessConversationService(
            BusinessConversationRepository conversationRepository,
            BusinessConversationParticipantRepository participantRepository,
            BusinessMessageRepository messageRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.conversationRepository = conversationRepository;
        this.participantRepository = participantRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<BusinessConversationResponse> listerMesConversations(String emailUtilisateur) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        return conversationRepository.findVisibleForUser(utilisateur.getId())
                .stream()
                .map(conversation -> toResponse(conversation, utilisateur))
                .toList();
    }

    public PagedResponse<BusinessConversationResponse> listerMesConversationsPage(
            String emailUtilisateur,
            int page,
            int size
    ) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        return PagedResponse.fromPage(conversationRepository
                .findVisibleForUser(
                        utilisateur.getId(),
                        PaginationUtils.pageRequest(page, size, Sort.unsorted())
                )
                .map(conversation -> toResponse(conversation, utilisateur)));
    }

    public BusinessConversationResponse getConversation(Long conversationId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        BusinessConversationParticipant participant = chargerParticipant(conversationId, utilisateur);
        return toResponse(participant.getConversation(), utilisateur);
    }

    public List<BusinessMessageResponse> listerMessages(Long conversationId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        chargerParticipant(conversationId, utilisateur);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(BusinessMessageResponse::fromEntity)
                .toList();
    }

    public PagedResponse<BusinessMessageResponse> listerMessagesPage(
            Long conversationId,
            String emailUtilisateur,
            int page,
            int size
    ) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        chargerParticipant(conversationId, utilisateur);
        return PagedResponse.fromPage(messageRepository
                .findByConversationId(
                        conversationId,
                        PaginationUtils.pageRequest(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
                )
                .map(BusinessMessageResponse::fromEntity));
    }

    public BusinessMessageResponse envoyerMessage(
            Long conversationId,
            SendBusinessMessageRequest request,
            String emailAuteur
    ) {
        return envoyerMessage(conversationId, request, emailAuteur, true);
    }

    private BusinessMessageResponse envoyerMessage(
            Long conversationId,
            SendBusinessMessageRequest request,
            String emailAuteur,
            boolean notifierParticipants
    ) {
        User auteur = chargerUtilisateurAutorise(emailAuteur);
        BusinessConversationParticipant participant = chargerParticipant(conversationId, auteur);
        BusinessConversation conversation = participant.getConversation();
        if (conversation.getStatus() == BusinessConversationStatus.ARCHIVED) {
            throw new AccessDeniedException("Cette conversation est archivee.");
        }

        BusinessMessage message = new BusinessMessage();
        message.setConversation(conversation);
        message.setAuteur(auteur);
        message.setContenu(request.getContenu().trim());
        message.setCreatedAt(LocalDateTime.now());

        BusinessMessage saved = messageRepository.save(message);
        conversation.setLastMessageAt(saved.getCreatedAt());
        conversation.setUpdatedAt(saved.getCreatedAt());
        conversationRepository.save(conversation);

        if (notifierParticipants) {
            notifierNouveauMessage(conversation, auteur);
        }
        return BusinessMessageResponse.fromEntity(saved);
    }

    public BusinessConversationResponse marquerLu(Long conversationId, String emailUtilisateur) {
        User utilisateur = chargerUtilisateurAutorise(emailUtilisateur);
        BusinessConversationParticipant participant = chargerParticipant(conversationId, utilisateur);
        participant.setLastReadAt(LocalDateTime.now());
        participantRepository.save(participant);
        return toResponse(participant.getConversation(), utilisateur);
    }

    public BusinessConversationResponse creerConversationAdminReferent(
            CreateBusinessConversationRequest request,
            String emailCreateur
    ) {
        return creerConversationAdminAvecRole(
                request,
                emailCreateur,
                Role.REFERENT,
                BusinessConversationType.ADMIN_REFERENT
        );
    }

    public BusinessConversationResponse creerConversationAdminPartenaire(
            CreateBusinessConversationRequest request,
            String emailCreateur
    ) {
        return creerConversationAdminAvecRole(
                request,
                emailCreateur,
                Role.PARTENAIRE,
                BusinessConversationType.ADMIN_PARTENAIRE
        );
    }

    private BusinessConversationResponse creerConversationAdminAvecRole(
            CreateBusinessConversationRequest request,
            String emailCreateur,
            Role roleDestinataire,
            BusinessConversationType type
    ) {
        User createur = chargerUtilisateurAutorise(emailCreateur);
        if (createur.getRole() != Role.ADMIN && createur.getRole() != Role.SUPER_ADMIN) {
            throw new AccessDeniedException("Seul un ADMIN ou SUPER_ADMIN peut creer cette conversation.");
        }

        User destinataire = userRepository.findById(request.getDestinataireId())
                .orElseThrow(() -> new RuntimeException("Destinataire introuvable."));
        if (!destinataire.isActif() || destinataire.getRole() != roleDestinataire) {
            throw new AccessDeniedException("Destinataire non autorise pour cette conversation.");
        }

        BusinessConversation conversation = new BusinessConversation();
        conversation.setType(type);
        conversation.setStatus(BusinessConversationStatus.ACTIVE);
        conversation.setContexteType(request.getContexteType() != null
                ? request.getContexteType()
                : BusinessConversationContextType.AUCUN);
        conversation.setContexteId(request.getContexteId());
        conversation.setCreatedBy(createur);
        conversation.setTitre(titreConversation(request, destinataire, type));
        BusinessConversation saved = conversationRepository.save(conversation);

        BusinessConversationParticipant createurParticipant = participant(saved, createur);
        BusinessConversationParticipant destinataireParticipant = participant(saved, destinataire);
        participantRepository.saveAll(List.of(createurParticipant, destinataireParticipant));

        String messageInitial = normalize(request.getMessageInitial());
        if (messageInitial != null) {
            SendBusinessMessageRequest messageRequest = new SendBusinessMessageRequest();
            messageRequest.setContenu(messageInitial);
            envoyerMessage(saved.getId(), messageRequest, createur.getEmail(), false);
        }

        notificationService.creer(
                destinataire,
                "Nouvelle conversation",
                createur.getPrenom() + " a ouvert une conversation métier avec vous.",
                "BUSINESS_CONVERSATION_CREATED",
                ACTION_PREFIX + saved.getId()
        );

        return toResponse(saved, createur);
    }

    private BusinessConversationParticipant participant(BusinessConversation conversation, User user) {
        BusinessConversationParticipant participant = new BusinessConversationParticipant();
        participant.setConversation(conversation);
        participant.setUser(user);
        participant.setRoleSnapshot(user.getRole());
        return participant;
    }

    private User chargerUtilisateurAutorise(String email) {
        User utilisateur = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
        if (utilisateur.getRole() == Role.MEMBRE || utilisateur.getRole() == Role.VISITEUR) {
            throw new AccessDeniedException("La messagerie metier est reservee aux roles professionnels.");
        }
        if (utilisateur.getRole() != Role.ADMIN
                && utilisateur.getRole() != Role.SUPER_ADMIN
                && utilisateur.getRole() != Role.REFERENT
                && utilisateur.getRole() != Role.PARTENAIRE) {
            throw new AccessDeniedException("Role non autorise.");
        }
        return utilisateur;
    }

    private BusinessConversationParticipant chargerParticipant(Long conversationId, User utilisateur) {
        return participantRepository.findByConversationIdAndUserId(conversationId, utilisateur.getId())
                .orElseThrow(() -> new AccessDeniedException("Vous n'etes pas participant a cette conversation."));
    }

    private BusinessConversationResponse toResponse(BusinessConversation conversation, User utilisateur) {
        BusinessConversationParticipant participant = chargerParticipant(conversation.getId(), utilisateur);
        List<BusinessConversationParticipant> participants =
                participantRepository.findByConversationIdOrderByIdAsc(conversation.getId());
        String preview = messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId())
                .map(BusinessMessage::getContenu)
                .map(this::preview)
                .orElse(null);
        long unread = messageRepository.countUnreadForParticipant(
                conversation.getId(),
                utilisateur.getId(),
                participant.getLastReadAt()
        );
        return BusinessConversationResponse.fromEntity(conversation, participants, preview, unread);
    }

    private void notifierNouveauMessage(BusinessConversation conversation, User auteur) {
        List<BusinessConversationParticipant> participants =
                participantRepository.findByConversationIdOrderByIdAsc(conversation.getId());
        for (BusinessConversationParticipant participant : participants) {
            User destinataire = participant.getUser();
            if (destinataire == null || destinataire.getId().equals(auteur.getId()) || !destinataire.isActif()) {
                continue;
            }
            notificationService.creer(
                    destinataire,
                    "Nouveau message",
                    auteur.getPrenom() + " a envoyé un message dans une conversation métier.",
                    "BUSINESS_MESSAGE",
                    ACTION_PREFIX + conversation.getId()
            );
        }
    }

    private String titreConversation(
            CreateBusinessConversationRequest request,
            User destinataire,
            BusinessConversationType type
    ) {
        String titre = normalize(request.getTitre());
        if (titre != null) return titre;
        String prefix = type == BusinessConversationType.ADMIN_REFERENT
                ? "Echange admin - referent"
                : "Echange admin - partenaire";
        return prefix + " : " + destinataire.getPrenom() + " " + destinataire.getNom();
    }

    private String preview(String contenu) {
        if (contenu == null || contenu.length() <= 120) return contenu;
        return contenu.substring(0, 117) + "...";
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
