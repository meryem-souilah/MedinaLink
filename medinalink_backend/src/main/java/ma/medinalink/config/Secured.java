// Secured.java
// Chemin : src/main/java/ma/medinalink/config/Secured.java
//
// Une annotation personnalisée pour marquer les endpoints protégés.
// Usage : @Secured sur une méthode ou une classe Resource
// ============================================================
 
package ma.medinalink.config;
 
import jakarta.ws.rs.NameBinding;
import java.lang.annotation.*;
 
@NameBinding
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface Secured {
}
 