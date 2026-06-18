package ma.medinalink.service;

// ============================================================
// JwtService.java
// Chemin : src/main/java/ma/medinalink/service/JwtService.java
//
// JWT = JSON Web Token
// Un JWT ressemble à ça : eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ...
// Il contient 3 parties séparées par des points :
//   1. Header  : algorithme utilisé
//   2. Payload : les données (userId, email, rôle, expiration)
//   3. Signature : pour vérifier que personne n'a modifié le token
//
// Workflow :
//   Login réussi → serveur génère un JWT → client le garde
//   Requêtes suivantes → client envoie JWT dans le header
//   Serveur vérifie le JWT → sait qui fait la requête
// ============================================================

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.enterprise.context.ApplicationScoped;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@ApplicationScoped
public class JwtService {

    // -------------------------------------------------------
    // Clé secrète pour signer les tokens
    // IMPORTANT : en production, mets cette clé dans une
    // variable d'environnement, pas dans le code !
    // Elle doit faire minimum 256 bits (32 caractères)
    // -------------------------------------------------------
    private static final String SECRET_KEY = ma.medinalink.config.AppConfig.jwtSecret();

    // Durée de validité du token : 24 heures (en millisecondes)

    // Token court (accès) : 1 heure
    private static final long EXPIRATION_MS = 60 * 60 * 1000L;

    // Token long (refresh) : 7 jours
    private static final long REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000L;

    public String generateRefreshToken(UUID userId) {
        return Jwts.builder()
                .subject(userId.toString())
                .claim("type", "refresh")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + REFRESH_TOKEN_EXPIRATION))
                .signWith(key)
                .compact();
    }

    // Objet représentant la clé secrète
    private final SecretKey key = Keys.hmacShaKeyFor(SECRET_KEY.getBytes());

    // -------------------------------------------------------
    // Générer un JWT pour un utilisateur connecté
    // -------------------------------------------------------
    public String generateToken(UUID userId, String email, String role) {
        Date now = new Date();
        Date expiration = new Date(now.getTime() + EXPIRATION_MS);

        return Jwts.builder()
                .subject(userId.toString()) // "sub" = identifiant principal
                .claim("email", email) // Données custom
                .claim("role", role)
                .issuedAt(now) // "iat" = date de création
                .expiration(expiration) // "exp" = date d'expiration
                .signWith(key) // Signature avec notre clé secrète
                .compact(); // Génère la string finale
    }

    // -------------------------------------------------------
    // Vérifier et lire un JWT
    // Retourne les "Claims" (les données dans le token)
    // Lance une exception si le token est invalide/expiré
    // -------------------------------------------------------
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(key) // Vérifie la signature
                .build()
                .parseSignedClaims(token)
                .getPayload(); // Retourne les données
    }

    // -------------------------------------------------------
    // Extraire l'ID utilisateur d'un token
    // -------------------------------------------------------
    public UUID getUserIdFromToken(String token) {
        Claims claims = validateToken(token);
        return UUID.fromString(claims.getSubject());
    }

    // -------------------------------------------------------
    // Extraire le rôle d'un token
    // -------------------------------------------------------
    public String getRoleFromToken(String token) {
        Claims claims = validateToken(token);
        return claims.get("role", String.class);
    }

    // -------------------------------------------------------
    // Vérifier si un token est valide (sans lancer d'exception)
    // -------------------------------------------------------
    public boolean isTokenValid(String token) {
        try {
            validateToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Token expiré, mal formé, ou mauvaise signature
            return false;
        }
    }
}