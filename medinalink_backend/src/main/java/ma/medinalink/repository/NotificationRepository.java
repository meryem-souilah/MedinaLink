package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.Notification;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class NotificationRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    @Transactional
    public Notification save(Notification notif) {
        em.persist(notif);
        return notif;
    }

    public List<Notification> findByUserId(UUID userId) {
        return em.createQuery(
            "SELECT n FROM Notification n WHERE n.userId = :userId ORDER BY n.createdAt DESC",
            Notification.class)
            .setParameter("userId", userId)
            .setMaxResults(20)
            .getResultList();
    }

    public long countUnread(UUID userId) {
        return em.createQuery(
            "SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false",
            Long.class)
            .setParameter("userId", userId)
            .getSingleResult();
    }

    @Transactional
    public void markAllRead(UUID userId) {
        em.createQuery(
            "UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
            .setParameter("userId", userId)
            .executeUpdate();
    }
}
