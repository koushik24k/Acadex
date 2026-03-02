package com.acadex.controller;

import com.acadex.dto.*;
import com.acadex.entity.User;
import com.acadex.entity.UserRole;
import com.acadex.repository.UserRepository;
import com.acadex.repository.UserRoleRepository;
import com.acadex.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
            SecurityContextHolder.getContext().setAuthentication(auth);
            String token = tokenProvider.generateToken(auth);

            User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
            List<String> roles = user.getRoles() != null
                    ? user.getRoles().stream().map(UserRole::getRole).collect(Collectors.toList())
                    : List.of("student");

            return ResponseEntity.ok(AuthResponse.builder()
                    .token(token)
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
                .role(request.getRole() != null ? request.getRole() : "student")
                .department(request.getDepartment())
                .build();
        userRoleRepository.save(role);

        String token = tokenProvider.generateTokenFromUsername(user.getEmail());

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
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
}
