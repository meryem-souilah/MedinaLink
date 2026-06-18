package ma.medinalink.repository;

// ============================================================
// UserRepository.java
// Chemin : src/main/java/ma/medinalink/repository/UserRepository.java
//
// Le Repository = la couche qui parle à la base de données.
// C'est ici qu'on écrit les requêtes SQL (en JPQL avec JPA).
//
// JPQL = Java Persistence Query Language
// C'est comme SQL mais on écrit des noms de classes Java
// au lieu de noms de tables.
//   SQL   : SELECT * FROM users WHERE email = 'x'
//   JPQL  : SELECT u FROM User u WHERE u.email = :email
// ============================================================

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


@ApplicationScoped
// @ApplicationScoped = CDI : une seule instance de cette classe
// pour toute l'application (singleton)

public class UserRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    // EntityManager = l'objet JPA qui fait le lien avec la BDD
    // unitName doit correspondre à ce qu'on a mis dans persistence.xml
    private EntityManager em;

    // -------------------------------------------------------
    // Sauvegarder un nouvel utilisateur
    // @Transactional = JPA ouvre une transaction automatiquement
    // -------------------------------------------------------
    @Transactional
    public User save(User user) {
        em.persist(user);  // INSERT INTO users (...)
        return user;
    }

    // -------------------------------------------------------
    // Trouver un utilisateur par son email
    // On retourne Optional<User> pour éviter NullPointerException
    // -------------------------------------------------------
    public Optional<User> findByEmail(String email) {
        try {
            User user = em.createQuery(
                    "SELECT u FROM User u WHERE u.email = :email",
                    User.class
            )
            .setParameter("email", email)
            .getSingleResult();
            // getSingleResult() lance une exception si rien trouvé
            // c'est pour ça qu'on attrape NoResultException

            return Optional.of(user);
        } catch (NoResultException e) {
            return Optional.empty();  // Pas trouvé = Optional vide
        }
    }

    // -------------------------------------------------------
    // Trouver un utilisateur par son ID
    // -------------------------------------------------------
    public Optional<User> findById(UUID id) {
        User user = em.find(User.class, id);
        // em.find() retourne null si pas trouvé
        return Optional.ofNullable(user);
    }
// Ajouter dans UserRepository.java

public List<User> findAll() {
    return em.createQuery("SELECT u FROM User u ORDER BY u.createdAt DESC", User.class)
             .getResultList();
}

@Transactional
public void updateRole(UUID id, ma.medinalink.entity.Role newRole) {
    User user = em.find(User.class, id);
    if (user != null) {
        user.setRole(newRole);
        em.merge(user);
    }
}
    // -------------------------------------------------------
    // Tous les agents actifs (pour l'assignation géographique)
    // -------------------------------------------------------
    public List<User> findAllAgents() {
        return em.createQuery(
            "SELECT u FROM User u WHERE u.role = ma.medinalink.entity.Role.AGENT AND u.isActive = true",
            User.class
        ).getResultList();
    }

    // -------------------------------------------------------
    // Vérifier si un email est déjà utilisé
    // -------------------------------------------------------
    public boolean existsByEmail(String email) {
        Long count = em.createQuery(
                "SELECT COUNT(u) FROM User u WHERE u.email = :email",
                Long.class
        )
        .setParameter("email", email)
        .getSingleResult();

        return count > 0;
    }
}