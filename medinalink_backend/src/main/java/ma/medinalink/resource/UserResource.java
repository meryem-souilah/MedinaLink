package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.entity.Role;
import ma.medinalink.entity.User;
import ma.medinalink.repository.UserRepository;
import ma.medinalink.service.JwtService;
import ma.medinalink.service.ReportService;
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

    @Inject
    private ReportService reportService;

    @Inject
    private JwtService jwtService;

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
    @GET
    @Path("/agents")
    public Response getAgents() {
        try {
            List<UserDto> agents = userRepository.findAllAgents()
                .stream().map(UserDto::from).collect(java.util.stream.Collectors.toList());
            return Response.ok(agents).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @POST
    @Path("/create-user")
    public Response createUser(Map<String, String> body) {
        try {
            String fullName   = body.get("fullName");
            String email      = body.get("email");
            String password   = body.get("password");
            String roleStr    = body.getOrDefault("role", "AGENT");
            String secteur    = body.get("secteur");
            String categories = body.get("categories");
            String latStr     = body.get("agentLatitude");
            String lngStr     = body.get("agentLongitude");

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
            if (secteur    != null && !secteur.isBlank())    newUser.setSecteur(secteur.trim());
            if (categories != null && !categories.isBlank()) newUser.setAgentCategories(categories.trim());
            if (latStr != null && !latStr.isBlank()) {
                try { newUser.setAgentLatitude(Double.parseDouble(latStr)); } catch (NumberFormatException ignored) {}
            }
            if (lngStr != null && !lngStr.isBlank()) {
                try { newUser.setAgentLongitude(Double.parseDouble(lngStr)); } catch (NumberFormatException ignored) {}
            }

            User saved = userRepository.save(newUser);

            // Si c'est un agent avec un secteur, assigner immédiatement les signalements PENDING correspondants
            if (saved.getRole() == Role.AGENT) {
                int assigned = reportService.assignPendingReportsToAgent(saved);
                System.out.println("[UserResource] Nouvel agent créé : " + assigned + " signalement(s) réassigné(s)");
            }

            return Response.status(201).entity(UserDto.from(saved)).build();

        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}/zone")
    public Response updateZone(@PathParam("id") UUID id, Map<String, String> body) {
        try {
            String secteur    = body.getOrDefault("secteur",    "").trim();
            String categories = body.getOrDefault("categories", "").trim();

            userRepository.updateZone(id,
                secteur.isBlank()    ? null : secteur,
                categories.isBlank() ? null : categories);

            // Recharger l'entité mise à jour et réassigner les signalements PENDING
            User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("Utilisateur non trouvé"));
            int assigned = reportService.assignPendingReportsToAgent(user);

            return Response.ok(Map.of(
                "message",  "Zone mise à jour — " + assigned + " signalement(s) réassigné(s)",
                "assigned", String.valueOf(assigned)
            )).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(Map.of("message", e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}/password")
    public Response resetPassword(@PathParam("id") UUID id, Map<String, String> body) {
        try {
            String newPassword = body.get("newPassword");
            if (newPassword == null || newPassword.length() < 6)
                return Response.status(400).entity(Map.of("message", "Le mot de passe doit faire au moins 6 caractères")).build();
            userRepository.updatePassword(id, BCrypt.hashpw(newPassword, BCrypt.gensalt(10)));
            return Response.ok(Map.of("message", "Mot de passe mis à jour avec succès")).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @PUT
    @Path("/{id}/toggle-active")
    public Response toggleActive(@PathParam("id") UUID id) {
        try {
            boolean nowActive = userRepository.toggleActive(id);
            return Response.ok(Map.of("message", nowActive ? "Compte activé" : "Compte désactivé", "isActive", String.valueOf(nowActive))).build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", e.getMessage())).build();
        }
    }

    @DELETE
    @Path("/{id}")
    public Response deleteUser(@PathParam("id") UUID id) {
        try {
            userRepository.deleteById(id);
            return Response.noContent().build();
        } catch (Exception e) {
            return Response.status(500).entity(Map.of("message", "Impossible de supprimer : " + e.getMessage())).build();
        }
    }

    @PUT
    @Path("/my/city")
    public Response updateMyCity(Map<String, String> body, @Context HttpHeaders headers) {
        try {
            String authHeader = headers.getHeaderString(HttpHeaders.AUTHORIZATION);
            UUID userId = jwtService.getUserIdFromToken(authHeader.substring(7));
            String city = body.getOrDefault("city", "").trim();
            userRepository.updateCity(userId, city.isBlank() ? null : city);
            return Response.ok(Map.of("message", "Ville mise à jour", "city", city)).build();
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
        public String secteur;
        public String agentCategories;
        public Double agentLatitude;
        public Double agentLongitude;
        public boolean isActive;

        public static UserDto from(User u) {
            UserDto dto = new UserDto();
            dto.id = u.getId();
            dto.fullName = u.getFullName();
            dto.email = u.getEmail();
            dto.role = u.getRole().name();
            dto.secteur = u.getSecteur();
            dto.agentCategories = u.getAgentCategories();
            dto.agentLatitude = u.getAgentLatitude();
            dto.agentLongitude = u.getAgentLongitude();
            dto.isActive = u.isActive();
            return dto;
        }
    }
}
