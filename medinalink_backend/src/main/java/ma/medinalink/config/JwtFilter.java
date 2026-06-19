package ma.medinalink.config;

import jakarta.annotation.Priority;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.Provider;
import ma.medinalink.service.JwtService;

@Provider
@Priority(Priorities.AUTHENTICATION)
public class JwtFilter implements ContainerRequestFilter {

    @Inject
    private JwtService jwtService;

    @Override
    public void filter(ContainerRequestContext requestContext) {

        String path = requestContext.getUriInfo().getPath();
        String method = requestContext.getMethod(); // GET, POST, PUT...

        // -------------------------------------------------------
        // Routes publiques : pas besoin de token
        // -------------------------------------------------------
        // Auth : inscription et connexion
        if (path.contains("/auth/")) {
            return;
        }

        // GET /reports, /reports/nearby, /reports/stats : lecture publique
        if (method.equals("GET") && path.contains("/reports")) {
            return;
        }

        // GET /users/agents : accessible aux agents et admins
        if (method.equals("GET") && path.endsWith("/agents")) {
            return;
        }

        // OPTIONS : requête CORS préliminaire du navigateur
        if (method.equals("OPTIONS")) {
            return;
        }

        // GET /ai/health : santé du service IA (publique)
        if (method.equals("GET") && path.contains("/ai/health")) {
            return;
        }

        // -------------------------------------------------------
        // Toutes les autres routes : token JWT obligatoire
        // (POST /reports, PUT /reports/{id}/status, etc.)
        // -------------------------------------------------------
        String authHeader = requestContext.getHeaderString("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Token manquant\"}")
                    .build()
            );
            return;
        }

        String token = authHeader.substring(7);

        if (!jwtService.isTokenValid(token)) {
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"message\":\"Token invalide ou expiré\"}")
                    .build()
            );
            return;
        }

        String role = jwtService.getRoleFromToken(token);

        // Citoyen peut mettre à jour sa propre ville
        if (method.equals("PUT") && path.endsWith("users/my/city")) {
            return;
        }

        // ADMIN uniquement : gestion des utilisateurs
        if (path.contains("/users")) {
            if (!"ADMIN".equals(role)) {
                requestContext.abortWith(
                    Response.status(Response.Status.FORBIDDEN)
                        .entity("{\"message\":\"Accès réservé aux administrateurs\"}")
                        .build()
                );
                return;
            }
        }

        // AGENT ou ADMIN : changer le statut d'un signalement
        if (method.equals("PUT") && path.matches(".*/reports/.*/status")) {
            if (!"AGENT".equals(role) && !"ADMIN".equals(role)) {
                requestContext.abortWith(
                    Response.status(Response.Status.FORBIDDEN)
                        .entity("{\"message\":\"Accès réservé aux agents municipaux\"}")
                        .build()
                );
                return;
            }
        }

        // AGENT ou ADMIN : créer ou modifier une priorité publique
        if (path.contains("/priorities")) {
            if (method.equals("POST") || method.equals("PUT")) {
                if (!"AGENT".equals(role) && !"ADMIN".equals(role)) {
                    requestContext.abortWith(
                        Response.status(Response.Status.FORBIDDEN)
                            .entity("{\"message\":\"Accès réservé aux agents municipaux\"}")
                            .build()
                    );
                    return;
                }
            }
        }
    }
}
 