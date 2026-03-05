package com.acadex.repository;

import com.acadex.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface UserRoleRepository extends JpaRepository<UserRole, Long> {
    List<UserRole> findByUserId(String userId);
    List<UserRole> findByRole(String role);

    @Modifying
    @Transactional
    void deleteByUserId(String userId);
}
