package com.acadex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String id;
    private String name;
    private String email;
    private List<String> roles;
}
