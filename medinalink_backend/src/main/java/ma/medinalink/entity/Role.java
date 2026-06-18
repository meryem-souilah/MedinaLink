// ============================================================
// Role.java
// Chemin : src/main/java/ma/medinalink/entity/Role.java
//
// Un "enum" = une liste fixe de valeurs possibles.
// Ici : les 3 rôles possibles dans l'application.
// ============================================================

package ma.medinalink.entity;

public enum Role {
    CITIZEN,   // Citoyen : peut créer des signalements
    AGENT,     // Agent municipal : peut gérer les signalements
    ADMIN      // Administrateur : accès total
}


