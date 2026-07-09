package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.CommentaireProjet;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentaireProjetRepository extends JpaRepository<CommentaireProjet, Long> {

    List<CommentaireProjet> findByProjetIdOrderByDateCommentaireAsc(Long projetId);

    Page<CommentaireProjet> findByProjetId(Long projetId, Pageable pageable);
}
