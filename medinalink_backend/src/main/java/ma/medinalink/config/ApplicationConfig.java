// ApplicationConfig.java
// Chemin : src/main/java/ma/medinalink/config/ApplicationConfig.java
//
// Ce fichier active JAX-RS et définit le préfixe de l'API.
// Toutes les URLs seront : /medinalink/api/v1/...
// ============================================================
 
package ma.medinalink.config;
 
import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;
 
@ApplicationPath("/api/v1")
// = Toutes les URLs commencent par /api/v1
public class ApplicationConfig extends Application {
    // Pas besoin de code ici, l'annotation suffit
}