package com.acadex.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.acadex.dto.ApiResponse;
import com.acadex.dto.AuthResponse;
import com.acadex.dto.LoginRequest;
import com.acadex.dto.RegisterRequest;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.acadex.security.JwtTokenProvider;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private UserRoleRepository userRoleRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtTokenProvider tokenProvider;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            String loginId = request.getEmail() != null ? request.getEmail().trim() : "";
            String email = resolveLoginEmail(loginId);

            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(auth);
            String token = tokenProvider.generateToken(auth);

            User user = userRepository.findByEmail(email).orElseThrow();
            List<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(r -> normalizeRole(r.getRole())).collect(Collectors.toList())
                    : List.of("student");
            String primaryRole = roles.isEmpty() ? "student" : roles.get(0);

            return ResponseEntity.ok(AuthResponse.builder()
                    .token(token)
                    .role(primaryRole.toUpperCase(Locale.ROOT))
                    .id(user.getId())
                    .name(user.getName())
                    .email(user.getEmail())
                    .roles(roles)
                    .build());
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(ApiResponse.error("Invalid email or password"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email already exists"));
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .build();
        user = userRepository.save(user);

        UserRole role = UserRole.builder()
                .user(user)
                .role(normalizeRole(request.getRole() != null ? request.getRole() : "student"))
                .department(request.getDepartment())
            .section(request.getSection())
                .build();
        userRoleRepository.save(role);

        String token = tokenProvider.generateTokenFromUsername(user.getEmail());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
            .role(role.getRole().toUpperCase(Locale.ROOT))
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(List.of(role.getRole()))
                .build());
    }

    @GetMapping("/session")
    public ResponseEntity<?> getSession() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }

        String email = ((UserDetails) auth.getPrincipal()).getUsername();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("User not found"));
        }

        List<String> roles = user.getRoles() != null
                ? user.getRoles().stream().map(UserRole::getRole).collect(Collectors.toList())
                : List.of("student");

        Map<String, Object> session = new HashMap<>();
        session.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "image", user.getImage() != null ? user.getImage() : "",
                "roles", roles
        ));
        return ResponseEntity.ok(session);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(ApiResponse.success("Logged out"));
    }

    private String resolveLoginEmail(String loginId) {
        if (loginId == null || loginId.isBlank()) {
            return loginId;
        }
        if (loginId.contains("@")) {
            return loginId;
        }
        return userRepository.findById(loginId)
                .map(User::getEmail)
                .orElse(loginId);
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) return "student";
        String normalized = role.trim().toLowerCase(Locale.ROOT);
        if ("faculity".equals(normalized) || "facalty".equals(normalized)) {
            return "faculty";
        }
        return normalized;
    }
}
