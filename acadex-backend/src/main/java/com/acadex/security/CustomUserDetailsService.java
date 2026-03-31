package com.acadex.security;

import java.util.Locale;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.acadex.entity.User;
import com.acadex.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    @Autowired
    private UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        var authorities = user.getRoles() != null
                ? user.getRoles().stream()
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + normalizeRole(r.getRole()).toUpperCase(Locale.ROOT)))
                    .collect(Collectors.toList())
                : java.util.Collections.singletonList(new SimpleGrantedAuthority("ROLE_STUDENT"));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
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
