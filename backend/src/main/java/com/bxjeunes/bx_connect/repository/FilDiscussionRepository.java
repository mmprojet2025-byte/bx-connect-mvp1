package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.FilDiscussion;
import com.bxjeunes.bx_connect.entity.TypeFil;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FilDiscussionRepository extends JpaRepository<FilDiscussion, Long> {

    // Tous les fils actifs
    List<FilDiscussion> findByActifTrueOrderByDateCreationDesc();

    // Fils par type
    List<FilDiscussion> findByTypeAndActifTrueOrderByDateCreationDesc(TypeFil type);

    // Fils d'un groupe
    List<FilDiscussion> findByGroupeIdAndActifTrueOrderByDateCreationDesc(Long groupeId);

    // Fils d'un projet
    List<FilDiscussion> findByProjetIdAndActifTrueOrderByDateCreationDesc(Long projetId);

    // Fils créés par un utilisateur
    List<FilDiscussion> findByCreateurIdOrderByDateCreationDesc(Long createurId);
}