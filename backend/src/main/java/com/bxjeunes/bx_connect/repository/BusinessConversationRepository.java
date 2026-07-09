package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.BusinessConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessConversationRepository extends JpaRepository<BusinessConversation, Long> {

    @Query("""
            SELECT DISTINCT c
            FROM BusinessConversation c
            JOIN c.participants p
            WHERE p.user.id = :userId
            ORDER BY COALESCE(c.lastMessageAt, c.updatedAt, c.createdAt) DESC
            """)
    List<BusinessConversation> findVisibleForUser(@Param("userId") Long userId);

    @Query(
            value = """
                    SELECT DISTINCT c
                    FROM BusinessConversation c
                    JOIN c.participants p
                    WHERE p.user.id = :userId
                    ORDER BY COALESCE(c.lastMessageAt, c.updatedAt, c.createdAt) DESC, c.updatedAt DESC
                    """,
            countQuery = """
                    SELECT COUNT(DISTINCT c)
                    FROM BusinessConversation c
                    JOIN c.participants p
                    WHERE p.user.id = :userId
                    """
    )
    Page<BusinessConversation> findVisibleForUser(@Param("userId") Long userId, Pageable pageable);
}
