package com.acadex.repository;

import com.acadex.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(String name, String email);
}
