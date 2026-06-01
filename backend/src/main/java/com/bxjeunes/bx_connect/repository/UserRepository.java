package com.bxjeunes.bx_connect.repository;

import com.bxjeunes.bx_connect.entity.Role;
import com.bxjeunes.bx_connect.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    long countByActifTrue();

    long countByRole(Role role);

    long countByRoleAndActifTrue(Role role);

    boolean existsByRole(Role role);

    List<User> findByRole(Role role);
}
