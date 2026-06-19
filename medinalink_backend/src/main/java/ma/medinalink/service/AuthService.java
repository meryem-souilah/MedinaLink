package ma.medinalink.service;

// ============================================================
// AuthService.java
// Chemin : src/main/java/ma/medinalink/service/AuthService.java
//
// Le Service = la logique métier de l'application.
// C'est ici qu'on code les règles :
//   - "Un email déjà utilisé → erreur"
//   - "Mot de passe incorrect → erreur"
//   - "Login réussi → générer un JWT"
//
// Séparation des responsabilités :
//   Resource (endpoint) → reçoit la requête HTTP
//   Service             → applique la logique métier
//   Repository          → parle à la BDD
// ============================================================

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotAuthorizedException;
import jakarta.ws.rs.NotFoundException;
import ma.medinalink.dto.AuthResponse;
import ma.medinalink.dto.LoginRequest;
import ma.medinalink.dto.RegisterRequest;
import ma.medinalink.entity.User;
import ma.medinalink.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import java.util.UUID;

@ApplicationScoped
public class AuthService {

    @Inject  // CDI injecte automatiquement l'instance (pas besoin de "new")
    private UserRepository userRepository;

    @Inject
    private JwtService jwtService;

    // -------------------------------------------------------
    // Inscription d'un nouvel utilisateur
    // -------------------------------------------------------
    public AuthResponse register(RegisterRequest request) {

        // 1. Validation basique
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new BadRequestException("L'email est obligatoire");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BadRequestException("Le mot de passe doit faire au moins 6 caractères");
        }
        if (request.getFullName() == null || request.getFullName().isBlank()) {
            throw new BadRequestException("Le nom complet est obligatoire");
        }

        // 2. Vérifier que l'email n'est pas déjà utilisé
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Cet email est déjà utilisé");
        }

        // 3. Hasher le mot de passe avec BCrypt
        // BCrypt.hashpw génère un hash sécurisé :
        //   "monmotdepasse" → "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"
        // Le "10" = facteur de coût (plus c'est élevé, plus c'est lent à casser)
        String passwordHash = BCrypt.hashpw(request.getPassword(), BCrypt.gensalt(10));

        // 4. Créer l'entité User
        User user = new User();
        user.setEmail(request.getEmail().toLowerCase().trim());
        user.setPasswordHash(passwordHash);
        user.setFullName(request.getFullName().trim());
        if (request.getCity() == null || request.getCity().isBlank()) {
            throw new BadRequestException("La ville est obligatoire");
        }
        user.setCity(request.getCity().trim());
        // Le rôle par défaut CITIZEN est mis dans @PrePersist de l'entité

        // 5. Sauvegarder en BDD
        User savedUser = userRepository.save(user);

        // 6. Générer le JWT
        String token = jwtService.generateToken(
            savedUser.getId(),
            savedUser.getEmail(),
            savedUser.getRole().name()
        );

        // 7. Retourner la réponse
        return new AuthResponse(
            token,
            savedUser.getId(),
            savedUser.getEmail(),
            savedUser.getFullName(),
            savedUser.getRole().name(),
            savedUser.getSecteur(),
            savedUser.getAgentCategories(),
            savedUser.getCity()
        );
    }

    // -------------------------------------------------------
    // Connexion d'un utilisateur existant
    // -------------------------------------------------------
    public AuthResponse login(LoginRequest request) {

        // 1. Chercher l'utilisateur par email (normaliser en minuscules)
        String emailNormalized = request.getEmail() == null ? "" : request.getEmail().toLowerCase().trim();
        User user = userRepository.findByEmail(emailNormalized)
            .orElseThrow(() -> new NotAuthorizedException(
                "Email ou mot de passe incorrect"
            ));

        // 2. Vérifier que le compte est actif
        if (!user.isActive()) {
            throw new NotAuthorizedException("Ce compte est désactivé");
        }

        // 3. Vérifier le mot de passe avec BCrypt
        // BCrypt.checkpw compare le mot de passe saisi avec le hash stocké
        boolean passwordCorrect = BCrypt.checkpw(
            request.getPassword(),
            user.getPasswordHash()
        );

        if (!passwordCorrect) {
            throw new NotAuthorizedException("Email ou mot de passe incorrect");
        }

        // 4. Générer le JWT
        String token = jwtService.generateToken(
            user.getId(),
            user.getEmail(),
            user.getRole().name()
        );

        // 5. Retourner la réponse
        return new AuthResponse(
            token,
            user.getId(),
            user.getEmail(),
            user.getFullName(),
            user.getRole().name(),
            user.getSecteur(),
            user.getAgentCategories(),
            user.getCity()
        );
    }

    // -------------------------------------------------------
    // Changer le mot de passe d'un utilisateur connecté
    // -------------------------------------------------------
    public void changePassword(UUID userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("Utilisateur non trouvé"));

        if (!BCrypt.checkpw(oldPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mot de passe actuel incorrect");
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new BadRequestException("Le nouveau mot de passe doit faire au moins 6 caractères");
        }

        String newHash = BCrypt.hashpw(newPassword, BCrypt.gensalt(10));
        userRepository.updatePassword(userId, newHash);
    }
}