package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.entity.Role;
import ma.medinalink.entity.User;
import ma.medinalink.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Path("/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@Secured
public class UserResource {

    @Inject
    private UserRepository userRepository;

    @GET
    public Response findAll() {
        try {
            List<UserDto> users = userRepository.findAll()
                .stream()
                .map(UserDto::from)
                .collect(Collectors.toList());
            return Response.ok(users).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    // -------------------------------------------------------
    // POST /api/v1/users/create-user
    // Créer un compte agent ou admin — réservé à l'ADMIN
    // Body : { "fullName": "...", "email": "...", "password": "...", "role": "AGENT|ADMIN" }
    // -------------------------------------------------------
    @POST
    @Path("/create-user")
    public Response createUser(Map<String, String> body) {
        try {
            String fullName = body.get("fullName");
            String email    = body.get("email");
            String password = body.get("password");
            String roleStr  = body.getOrDefault("role", "AGENT");

            if (fullName == null || fullName.isBlank())
                return Response.status(400).entity(Map.of("message", "Le nom complet est obligatoire")).build();
            if (email == null || email.isBlank())
                return Response.status(400).entity(Map.of("message", "L'email est obligatoire")).build();
            if (password == null || password.length() < 6)
                return Response.status(400).entity(Map.of("message", "Le mot de passe doit faire au moins 6 caractères")).build();
            if (userRepository.existsByEmail(email.toLowerCase().trim()))
                return Response.status(400).entity(Map.of("message", "Cet email est déjà utilisé")).build();

            Role role;
            try {
                role = Role.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return Response.status(400).entity(Map.of("message", "Rôle invalide : " + roleStr)).build();
            }

            String hash = BCrypt.hashpw(password, BCrypt.gensalt(10));

            User newUser = new User();
            newUser.setFullName(fullName.trim());
            newUser.setEmail(email.toLowerCase().trim());
            newUser.setPasswordHash(hash);
            newUser.setRole(role);

            User saved = userRepository.save(newUser);
            return Response.status(201).entity(UserDto.from(saved)).build();

        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}/role")
    public Response updateRole(@PathParam("id") UUID id, Map<String, String> body) {
        try {
            String roleStr = body.get("role");
            if (roleStr == null || roleStr.isBlank()) {
                return Response.status(400).entity(Map.of("message", "Le rôle est obligatoire")).build();
            }
            Role newRole;
            try {
                newRole = Role.valueOf(roleStr.toUpperCase());
            } catch (IllegalArgumentException e) {
                return Response.status(400).entity(Map.of("message", "Rôle invalide : " + roleStr)).build();
            }
            userRepository.updateRole(id, newRole);
            return Response.ok(Map.of("message", "Rôle mis à jour avec succès")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    public static class UserDto {
        public UUID id;
        public String fullName;
        public String email;
        public String role;

        public static UserDto from(User u) {
            UserDto dto = new UserDto();
            dto.id = u.getId();
            dto.fullName = u.getFullName();
            dto.email = u.getEmail();
            dto.role = u.getRole().name();
            return dto;
        }
    }
}
