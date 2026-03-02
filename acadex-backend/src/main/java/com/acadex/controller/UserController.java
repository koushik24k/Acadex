package com.acadex.controller;

import com.acadex.dto.ApiResponse;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication auth) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        List<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(UserRole::getRole).collect(Collectors.toList())
                : List.of();

        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("image", user.getImage());
        result.put("roles", roles);
        result.put("createdAt", user.getCreatedAt());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(Authentication auth, @RequestBody Map<String, Object> body) {
        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        if (body.containsKey("name")) user.setName((String) body.get("name"));
        if (body.containsKey("image")) user.setImage((String) body.get("image"));
        userRepository.save(user);

        return ResponseEntity.ok(ApiResponse.success("Profile updated"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable String id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.notFound().build();

        List<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(UserRole::getRole).collect(Collectors.toList())
                : List.of();

        Map<String, Object> result = new HashMap<>();
        result.put("id", user.getId());
        result.put("name", user.getName());
        result.put("email", user.getEmail());
        result.put("roles", roles);
        return ResponseEntity.ok(result);
    }
}
