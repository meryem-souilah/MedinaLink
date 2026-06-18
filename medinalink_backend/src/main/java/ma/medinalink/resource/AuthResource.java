package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.config.Secured;
import ma.medinalink.dto.AuthResponse;
import ma.medinalink.dto.LoginRequest;
import ma.medinalink.dto.RegisterRequest;
import ma.medinalink.service.AuthService;
import ma.medinalink.service.JwtService;
import java.util.Map;
import java.util.UUID;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    private AuthService authService;

    @Inject
    private JwtService jwtService;

    @POST
    @Path("/register")
    public Response register(RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return Response
                .status(Response.Status.CREATED)
                .entity(response)
                .build();
        } catch (BadRequestException e) {
            return Response
                .status(Response.Status.BAD_REQUEST)
                .entity(new ErrorMessage(e.getMessage()))
                .build();
        } catch (Exception e) {
            return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorMessage("Erreur serveur : " + e.getMessage()))
                .build();
        }
    }

    @POST
    @Path("/login")
    public Response login(LoginRequest request) {
        try {
            AuthResponse response = authService.login(request);
            return Response
                .status(Response.Status.OK)
                .entity(response)
                .build();
        } catch (NotAuthorizedException e) {
            return Response
                .status(Response.Status.UNAUTHORIZED)
                .entity(new ErrorMessage("Email ou mot de passe incorrect"))
                .build();
        } catch (Exception e) {
            return Response
                .status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new ErrorMessage("Erreur serveur : " + e.getMessage()))
                .build();
        }
    }

    @POST
    @Path("/change-password")
    @Secured
    public Response changePassword(Map<String, String> body, @Context HttpHeaders headers) {
        try {
            String authHeader = headers.getHeaderString(HttpHeaders.AUTHORIZATION);
            UUID userId = jwtService.getUserIdFromToken(authHeader.substring(7));

            String oldPassword = body.get("oldPassword");
            String newPassword = body.get("newPassword");

            if (oldPassword == null || oldPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
                return Response.status(400).entity(new ErrorMessage("Champs requis manquants")).build();
            }

            authService.changePassword(userId, oldPassword, newPassword);
            return Response.ok(new ErrorMessage("Mot de passe modifié avec succès")).build();
        } catch (BadRequestException e) {
            return Response.status(400).entity(new ErrorMessage(e.getMessage())).build();
        } catch (NotFoundException e) {
            return Response.status(404).entity(new ErrorMessage(e.getMessage())).build();
        } catch (Exception e) {
            return Response.status(500).entity(new ErrorMessage("Erreur serveur : " + e.getMessage())).build();
        }
    }

    @GET
    @Path("/test")
    public Response test() {
        return Response.ok(new ErrorMessage("MedinaLink API fonctionne !")).build();
    }

    public static class ErrorMessage {
        public String message;
        public ErrorMessage(String message) {
            this.message = message;
        }
    }
}