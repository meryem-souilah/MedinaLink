package ma.medinalink.resource;

import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import ma.medinalink.dto.AuthResponse;
import ma.medinalink.dto.LoginRequest;
import ma.medinalink.dto.RegisterRequest;
import ma.medinalink.service.AuthService;

@Path("/auth")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class AuthResource {

    @Inject
    private AuthService authService;

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