package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.Report;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class ReportRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    // -------------------------------------------------------
    // Sauvegarder un nouveau signalement
    // -------------------------------------------------------
    @Transactional
    public Report save(Report report) {
        em.persist(report);
        return report;
    }

    // -------------------------------------------------------
    // Trouver par ID
    // -------------------------------------------------------
    public Optional<Report> findById(UUID id) {
        Report report = em.find(Report.class, id);
        return Optional.ofNullable(report);
    }

    // -------------------------------------------------------
    // Tous les signalements avec pagination et filtres optionnels
    // -------------------------------------------------------
    public List<Report> findAll(int page, int size, String status, String category) {
        StringBuilder jpql = new StringBuilder("SELECT r FROM Report r");
        List<String> conditions = new java.util.ArrayList<>();

        if (status != null && !status.isBlank()) {
            conditions.add("r.status = :status");
        }
        if (category != null && !category.isBlank()) {
            conditions.add("r.category = :category");
        }
        if (!conditions.isEmpty()) {
            jpql.append(" WHERE ").append(String.join(" AND ", conditions));
        }
        jpql.append(" ORDER BY r.createdAt DESC");

        var query = em.createQuery(jpql.toString(), Report.class);
        if (status != null && !status.isBlank()) {
            query.setParameter("status", status);
        }
        if (category != null && !category.isBlank()) {
            query.setParameter("category", category);
        }
        return query.setFirstResult(page * size).setMaxResults(size).getResultList();
    }

    // -------------------------------------------------------
    // Signalements à proximité d'un point GPS
    // On calcule la distance avec la formule de Haversine en SQL
    // radiusMeters = rayon en mètres
    // -------------------------------------------------------
    public List<Report> findNearby(double lng, double lat, double radiusMeters) {
        // Conversion du rayon en degrés (approximation : 1 degré ≈ 111 km)
        double radiusDegrees = radiusMeters / 111000.0;

        return em.createQuery(
                "SELECT r FROM Report r WHERE " +
                "r.longitude BETWEEN :lngMin AND :lngMax AND " +
                "r.latitude BETWEEN :latMin AND :latMax " +
                "ORDER BY r.createdAt DESC",
                Report.class)
                .setParameter("lngMin", lng - radiusDegrees)
                .setParameter("lngMax", lng + radiusDegrees)
                .setParameter("latMin", lat - radiusDegrees)
                .setParameter("latMax", lat + radiusDegrees)
                .getResultList();
    }

    // -------------------------------------------------------
    // Filtrer par statut
    // -------------------------------------------------------
    public List<Report> findByStatus(String status) {
        return em.createQuery(
                "SELECT r FROM Report r WHERE r.status = :status ORDER BY r.createdAt DESC",
                Report.class)
                .setParameter("status", status)
                .getResultList();
    }

    // -------------------------------------------------------
    // Filtrer par catégorie
    // -------------------------------------------------------
    public List<Report> findByCategory(String category) {
        return em.createQuery(
                "SELECT r FROM Report r WHERE r.category = :category ORDER BY r.createdAt DESC",
                Report.class)
                .setParameter("category", category)
                .getResultList();
    }

    // -------------------------------------------------------
    // Signalements d'un utilisateur
    // -------------------------------------------------------
    public List<Report> findByUserId(UUID userId) {
        return em.createQuery(
                "SELECT r FROM Report r WHERE r.user.id = :userId ORDER BY r.createdAt DESC",
                Report.class)
                .setParameter("userId", userId)
                .getResultList();
    }

    // -------------------------------------------------------
    // Mettre à jour un signalement existant (merge)
    // -------------------------------------------------------
    @Transactional
    public Report update(Report report) {
        return em.merge(report);
    }

    // -------------------------------------------------------
    // Mettre à jour le statut
    // -------------------------------------------------------
    @Transactional
    public Report updateStatus(UUID id, String newStatus) {
        Report report = em.find(Report.class, id);
        if (report != null) {
            report.setStatus(newStatus);
            em.merge(report);
        }
        return report;
    }

    // -------------------------------------------------------
    // Signalements assignés à un agent (avec filtres)
    // -------------------------------------------------------
    public List<Report> findByAgentId(UUID agentId, int page, int size, String status, String category) {
        StringBuilder jpql = new StringBuilder("SELECT r FROM Report r WHERE r.assignedAgentId = :agentId");
        if (status != null && !status.isBlank())   jpql.append(" AND r.status = :status");
        if (category != null && !category.isBlank()) jpql.append(" AND r.category = :category");
        jpql.append(" ORDER BY r.createdAt DESC");

        var query = em.createQuery(jpql.toString(), Report.class).setParameter("agentId", agentId);
        if (status != null && !status.isBlank())   query.setParameter("status", status);
        if (category != null && !category.isBlank()) query.setParameter("category", category);
        return query.setFirstResult(page * size).setMaxResults(size).getResultList();
    }

    // -------------------------------------------------------
    // Statistiques par agent
    // -------------------------------------------------------
    public java.util.Map<String, Long> countStatsByAgent(UUID agentId) {
        List<Object[]> rows = em.createQuery(
            "SELECT r.status, COUNT(r) FROM Report r WHERE r.assignedAgentId = :agentId GROUP BY r.status",
            Object[].class
        ).setParameter("agentId", agentId).getResultList();
        java.util.Map<String, Long> map = new java.util.HashMap<>();
        long total = 0L;
        for (Object[] row : rows) {
            long count = (Long) row[1];
            map.put((String) row[0], count);
            total += count;
        }
        map.put("TOTAL", total);
        return map;
    }

    // -------------------------------------------------------
    // Statistiques globales : nombre de signalements par statut
    // -------------------------------------------------------
    public java.util.Map<String, Long> countStats() {
        List<Object[]> rows = em.createQuery(
            "SELECT r.status, COUNT(r) FROM Report r GROUP BY r.status", Object[].class
        ).getResultList();
        java.util.Map<String, Long> map = new java.util.HashMap<>();
        long total = 0L;
        for (Object[] row : rows) {
            long count = (Long) row[1];
            map.put((String) row[0], count);
            total += count;
        }
        map.put("TOTAL", total);
        return map;
    }

    // -------------------------------------------------------
    // Signalements PENDING dans une zone GPS (bounding box rapide)
    // Le filtre haversine exact est fait côté service
    // -------------------------------------------------------
    public List<Report> findPendingInBoundingBox(double lat, double lng, double radiusDegrees) {
        return em.createQuery(
            "SELECT r FROM Report r WHERE r.status = 'PENDING' " +
            "AND r.latitude  BETWEEN :latMin AND :latMax " +
            "AND r.longitude BETWEEN :lngMin AND :lngMax",
            Report.class
        )
        .setParameter("latMin", lat - radiusDegrees)
        .setParameter("latMax", lat + radiusDegrees)
        .setParameter("lngMin", lng - radiusDegrees)
        .setParameter("lngMax", lng + radiusDegrees)
        .getResultList();
    }

    // -------------------------------------------------------
    // Signalements PENDING dont l'adresse contient le secteur donné
    // (fallback textuel quand l'agent n'a pas de GPS)
    // -------------------------------------------------------
    public List<Report> findPendingBySectorText(String sector) {
        String pattern = "%" + sector.toLowerCase() + "%";
        return em.createQuery(
            "SELECT r FROM Report r WHERE r.status = 'PENDING' AND LOWER(r.address) LIKE :pattern",
            Report.class
        ).setParameter("pattern", pattern).getResultList();
    }

    // -------------------------------------------------------
    // Ajouter un upvote
    // -------------------------------------------------------
    @Transactional
    public Report upvote(UUID id) {
        Report report = em.find(Report.class, id);
        if (report != null) {
            report.setUpvotes(report.getUpvotes() + 1);
            em.merge(report);
        }
        return report;
    }
}