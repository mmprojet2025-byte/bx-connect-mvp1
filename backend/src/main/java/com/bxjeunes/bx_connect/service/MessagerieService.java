package com.bxjeunes.bx_connect.service;

import com.bxjeunes.bx_connect.dto.FilDiscussionRequest;
import com.bxjeunes.bx_connect.dto.FilDiscussionResponse;
import com.bxjeunes.bx_connect.dto.MessageRequest;
import com.bxjeunes.bx_connect.dto.MessageResponse;
import com.bxjeunes.bx_connect.entity.FilDiscussion;
import com.bxjeunes.bx_connect.entity.Message;
import com.bxjeunes.bx_connect.entity.TypeFil;
import com.bxjeunes.bx_connect.entity.User;
import com.bxjeunes.bx_connect.repository.FilDiscussionRepository;
import com.bxjeunes.bx_connect.repository.MessageRepository;
import com.bxjeunes.bx_connect.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessagerieService {

    private final FilDiscussionRepository filRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessagerieService(FilDiscussionRepository filRepository,
                             MessageRepository messageRepository,
                             UserRepository userRepository) {
        this.filRepository = filRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    // ─── Fils de discussion ──────────────────────────────────────────────────

    public List<FilDiscussionResponse> listerTousLesFils() {
        return filRepository.findByActifTrueOrderByDateCreationDesc()
                .stream()
                .map(FilDiscussionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public List<FilDiscussionResponse> listerFilsParType(TypeFil type) {
        return filRepository.findByTypeAndActifTrueOrderByDateCreationDesc(type)
                .stream()
                .map(FilDiscussionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public FilDiscussionResponse creerFil(FilDiscussionRequest request, String emailCreateur) {
        User createur = userRepository.findByEmail(emailCreateur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        FilDiscussion fil = new FilDiscussion();
        fil.setTitre(request.getTitre());
        fil.setDescription(request.getDescription());
        fil.setType(request.getType());
        fil.setCreateur(createur);
        fil.setDateCreation(LocalDateTime.now());
        fil.setActif(true);

        return FilDiscussionResponse.fromEntity(filRepository.save(fil));
    }

    public FilDiscussionResponse getFilById(Long id) {
        FilDiscussion fil = filRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fil de discussion introuvable"));
        return FilDiscussionResponse.fromEntity(fil);
    }

    public void supprimerFil(Long id) {
        FilDiscussion fil = filRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fil de discussion introuvable"));
        fil.setActif(false);
        filRepository.save(fil);
    }

    // ─── Messages ────────────────────────────────────────────────────────────

    public List<MessageResponse> listerMessages(Long filId) {
        return messageRepository.findByFilIdOrderByDateEnvoiAsc(filId)
                .stream()
                .map(MessageResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public MessageResponse envoyerMessage(MessageRequest request, String emailAuteur) {
        User auteur = userRepository.findByEmail(emailAuteur)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

        FilDiscussion fil = filRepository.findById(request.getFilId())
                .orElseThrow(() -> new RuntimeException("Fil de discussion introuvable"));

        Message message = new Message();
        message.setContenu(request.getContenu());
        message.setDateEnvoi(LocalDateTime.now());
        message.setLu(false);
        message.setAuteur(auteur);
        message.setFil(fil);

        return MessageResponse.fromEntity(messageRepository.save(message));
    }

    public void marquerCommeLu(Long messageId, String emailUtilisateur) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message introuvable"));
        message.setLu(true);
        messageRepository.save(message);
    }

    public long compterMessagesNonLus(Long filId) {
        return messageRepository.countByFilIdAndLuFalse(filId);
    }
}