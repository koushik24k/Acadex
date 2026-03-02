package com.acadex.security;

import com.acadex.entity.User;
import com.acadex.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

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
                    .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getRole().toUpperCase()))
                    .collect(Collectors.toList())
                : java.util.Collections.singletonList(new SimpleGrantedAuthority("ROLE_STUDENT"));

        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                authorities
        );
    }
}
