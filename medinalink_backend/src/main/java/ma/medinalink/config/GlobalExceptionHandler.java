package ma.medinalink.config;

import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ExceptionMapper;
import jakarta.ws.rs.ext.Provider;

@Provider
public class GlobalExceptionHandler implements ExceptionMapper<Exception> {

    @Override
    public Response toResponse(Exception e) {
        // Log l'erreur
        System.err.println("Erreur non gérée : " + e.getMessage());
        
        return Response
            .status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity("{\"message\":\"Une erreur interne s'est produite\"}")
            .build();
    }
}