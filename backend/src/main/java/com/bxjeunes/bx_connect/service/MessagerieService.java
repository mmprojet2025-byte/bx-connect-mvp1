package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.FilDiscussionRequest;
import com.bxjeunes.bx_connect.dto.FilDiscussionResponse;
import com.bxjeunes.bx_connect.dto.MessageRequest;
import com.bxjeunes.bx_connect.dto.MessageResponse;
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
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class MessagerieService {

    private final FilDiscussionRepository filRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final GroupeRepository groupeRepository;
    private final MembreGroupeRepository membreGroupeRepository;
    private final NotificationService notificationService;

    public MessagerieService(FilDiscussionRepository filRepository,
                             MessageRepository messageRepository,
                             UserRepository userRepository,
                             GroupeRepository groupeRepository,
                             MembreGroupeRepository membreGroupeRepository,
                             NotificationService notificationService) {
        this.filRepository = filRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.groupeRepository = groupeRepository;
        this.membreGroupeRepository = membreGroupeRepository;
        this.notificationService = notificationService;
    }

    // ─── Fils de discussion ──────────────────────────────────────────────────

    public List<FilDiscussionResponse> listerTousLesFils(String emailUtilisateur) {
        User utilisateur = getUtilisateur(emailUtilisateur);
        refuserRolesHorsMessagerieGroupe(utilisateur);

        if (utilisateur.getRole() == Role.MEMBRE) {
            return membreGroupeRepository
                    .findFirstByUserIdAndStatut(utilisateur.getId(), StatutMembre.ACCEPTE)
                    .map(mg -> filRepository.findByGroupeIdAndActifTrueOrderByDateCreationDesc(mg.getGroupe().getId()))
                    .orElse(List.of())
                    .stream()
                    .map(FilDiscussionResponse::fromEntity)
                    .collect(Collectors.toList());
        }

        return filRepository.findByActifTrueOrderByDateCreationDesc()
                .stream()
                .filter(fil -> fil.getGroupe() != null &&
                        fil.getGroupe().getReferent() != null &&
                        fil.getGroupe().getReferent().getId().equals(utilisateur.getId()))
                .map(FilDiscussionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<FilDiscussionResponse> listerFilsParType(TypeFil type, String emailUtilisateur) {
        return listerTousLesFils(emailUtilisateur).stream()
                .filter(fil -> fil.getType() == type)
                .collect(Collectors.toList());
    }

    public FilDiscussionResponse getFilGroupe(Long groupeId, String emailUtilisateur) {
        verifierAccesGroupeMessagerie(emailUtilisateur, groupeId);
        return filRepository.findFirstByGroupeIdAndActifTrueOrderByDateCreationDesc(groupeId)
                .map(FilDiscussionResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Aucun fil actif pour ce groupe."));
    }

    public FilDiscussionResponse creerFilGroupe(FilDiscussionRequest request, String emailCreateur) {
        if (request.getGroupeId() == null) {
            throw new AccessDeniedException("Un fil de messagerie groupe doit etre lie a un groupe.");
        }

        User createur = getUtilisateur(emailCreateur);
        if (createur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Seul le REFERENT du groupe peut creer un fil de groupe.");
        }

        Groupe groupe = verifierAccesGroupeMessagerie(emailCreateur, request.getGroupeId());

        FilDiscussion fil = new FilDiscussion();
        fil.setTitre(request.getTitre());
        fil.setDescription(request.getDescription());
        fil.setType(request.getType() != null ? request.getType() : TypeFil.GENERAL);
        fil.setCreateur(createur);
        fil.setGroupe(groupe);
        fil.setDateCreation(LocalDateTime.now());
        fil.setActif(true);

        return FilDiscussionResponse.fromEntity(filRepository.save(fil));
    }

    public com.bxjeunes.bx_connect.dto.GroupeResponse monGroupe(String emailUtilisateur) {
        User utilisateur = getUtilisateur(emailUtilisateur);
        if (utilisateur.getRole() != Role.MEMBRE) {
            throw new AccessDeniedException("Cet endpoint est reserve aux MEMBRES.");
        }
        return membreGroupeRepository.findFirstByUserIdAndStatut(utilisateur.getId(), StatutMembre.ACCEPTE)
                .map(MembreGroupe::getGroupe)
                .map(com.bxjeunes.bx_connect.dto.GroupeResponse::fromEntity)
                .orElseThrow(() -> new AccessDeniedException("Vous n'appartenez a aucun groupe actif."));
    }

    public FilDiscussionResponse creerFil(FilDiscussionRequest request, String emailCreateur) {
        return creerFilGroupe(request, emailCreateur);
    }

    public FilDiscussionResponse getFilById(Long id, String emailUtilisateur) {
        FilDiscussion fil = verifierAccesFil(emailUtilisateur, id);
        return FilDiscussionResponse.fromEntity(fil);
    }

    public void supprimerFil(Long id, String emailUtilisateur) {
        FilDiscussion fil = verifierAccesFil(emailUtilisateur, id);
        User utilisateur = getUtilisateur(emailUtilisateur);
        if (utilisateur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("Seul le REFERENT du groupe peut moderer ce fil.");
        }
        fil.setActif(false);
        filRepository.save(fil);
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    public List<MessageResponse> listerMessages(Long filId, String emailUtilisateur) {
        verifierAccesFil(emailUtilisateur, filId);
        return messageRepository.findByFilIdOrderByDateEnvoiAsc(filId)
                .stream()
                .map(MessageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public MessageResponse envoyerMessageGroupe(Long groupeId, String contenu, String emailAuteur) {
        if (contenu == null || contenu.isBlank()) {
            throw new RuntimeException("Le contenu du message est obligatoire.");
        }
        verifierAccesGroupeMessagerie(emailAuteur, groupeId);
        FilDiscussion fil = filRepository.findFirstByGroupeIdAndActifTrueOrderByDateCreationDesc(groupeId)
                .orElseThrow(() -> new RuntimeException("Aucun fil actif pour ce groupe."));

        MessageRequest request = new MessageRequest();
        request.setFilId(fil.getId());
        request.setContenu(contenu);
        return envoyerMessage(request, emailAuteur);
    }

    public MessageResponse envoyerMessage(MessageRequest request, String emailAuteur) {
        User auteur = getUtilisateur(emailAuteur);
        FilDiscussion fil = verifierAccesFil(emailAuteur, request.getFilId());

        Message message = new Message();
        message.setContenu(request.getContenu());
        message.setDateEnvoi(LocalDateTime.now());
        message.setLu(false);
        message.setAuteur(auteur);
        message.setFil(fil);

        Message messageSauve = messageRepository.save(message);
        notifierNouveauMessage(fil, auteur);
        return MessageResponse.fromEntity(messageSauve);
    }

    public void marquerCommeLu(Long messageId, String emailUtilisateur) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message introuvable"));
        verifierAccesFil(emailUtilisateur, message.getFil().getId());
        message.setLu(true);
        messageRepository.save(message);
    }

    public long compterMessagesNonLus(Long filId, String emailUtilisateur) {
        verifierAccesFil(emailUtilisateur, filId);
        return messageRepository.countByFilIdAndLuFalse(filId);
    }

    public FilDiscussion verifierAccesFil(String emailUtilisateur, Long filId) {
        FilDiscussion fil = filRepository.findById(filId)
                .orElseThrow(() -> new RuntimeException("Fil de discussion introuvable"));
        if (!fil.isActif()) {
            throw new AccessDeniedException("Ce fil n'est pas actif.");
        }
        if (fil.getGroupe() == null) {
            throw new AccessDeniedException("La messagerie de groupe exige un groupe.");
        }
        verifierAccesGroupeMessagerie(emailUtilisateur, fil.getGroupe().getId());
        return fil;
    }

    public Groupe verifierAccesGroupeMessagerie(String emailUtilisateur, Long groupeId) {
        User utilisateur = getUtilisateur(emailUtilisateur);
        refuserRolesHorsMessagerieGroupe(utilisateur);

        Groupe groupe = groupeRepository.findById(groupeId)
                .orElseThrow(() -> new RuntimeException("Groupe introuvable : " + groupeId));

        if (utilisateur.getRole() == Role.REFERENT) {
            if (groupe.getReferent() == null || !groupe.getReferent().getId().equals(utilisateur.getId())) {
                throw new AccessDeniedException("Vous n'etes pas le referent de ce groupe.");
            }
            return groupe;
        }

        MembreGroupe adhesion = membreGroupeRepository
                .findFirstByUserIdAndStatut(utilisateur.getId(), StatutMembre.ACCEPTE)
                .orElseThrow(() -> new AccessDeniedException("Vous n'appartenez a aucun groupe actif."));

        if (!adhesion.getGroupe().getId().equals(groupeId)) {
            throw new AccessDeniedException("Vous n'avez pas acces a la messagerie de ce groupe.");
        }

        return groupe;
    }

    private User getUtilisateur(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
    }

    private void notifierNouveauMessage(FilDiscussion fil, User auteur) {
        Groupe groupe = fil.getGroupe();
        Map<Long, User> destinataires = new LinkedHashMap<>();

        for (MembreGroupe adhesion : membreGroupeRepository.findByGroupeIdAndStatut(
                groupe.getId(),
                StatutMembre.ACCEPTE
        )) {
            User membre = adhesion.getUser();
            if (membre != null && membre.isActif()) {
                destinataires.put(membre.getId(), membre);
            }
        }

        User referent = groupe.getReferent();
        if (referent != null && referent.isActif()) {
            destinataires.put(referent.getId(), referent);
        }
        destinataires.remove(auteur.getId());

        for (User destinataire : destinataires.values()) {
            notificationService.creer(
                    destinataire,
                    "Nouveau message",
                    auteur.getPrenom() + " a envoyé un message dans " + groupe.getNom() + ".",
                    "MESSAGE",
                    "/messagerie"
            );
        }
    }

    private void refuserRolesHorsMessagerieGroupe(User utilisateur) {
        if (utilisateur.getRole() == Role.ADMIN || utilisateur.getRole() == Role.SUPER_ADMIN) {
            throw new AccessDeniedException("ADMIN et SUPER_ADMIN n'ont pas acces aux messages des groupes.");
        }
        if (utilisateur.getRole() != Role.MEMBRE && utilisateur.getRole() != Role.REFERENT) {
            throw new AccessDeniedException("La messagerie de groupe est reservee aux MEMBRES et REFERENTS.");
        }
    }
}
