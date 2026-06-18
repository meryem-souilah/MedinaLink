package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.PriorityStatus;
import ma.medinalink.entity.PublicPriority;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class PriorityRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    @Transactional
    public PublicPriority save(PublicPriority priority) {
        em.persist(priority);
        return priority;
    }

    public Optional<PublicPriority> findById(UUID id) {
        return Optional.ofNullable(em.find(PublicPriority.class, id));
    }

    public List<PublicPriority> findAll(String status, UUID communeId, int page, int size) {
        StringBuilder query = new StringBuilder("SELECT p FROM PublicPriority p");
        List<String> conditions = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            conditions.add("p.status = :status");
        }
        if (communeId != null) {
            conditions.add("p.commune.id = :communeId");
        }

        if (!conditions.isEmpty()) {
            query.append(" WHERE ").append(String.join(" AND ", conditions));
        }

        query.append(" ORDER BY p.createdAt DESC");

        var typedQuery = em.createQuery(query.toString(), PublicPriority.class);

        if (status != null && !status.isBlank()) {
            typedQuery.setParameter("status", PriorityStatus.valueOf(status.toUpperCase()));
        }
        if (communeId != null) {
            typedQuery.setParameter("communeId", communeId);
        }

        typedQuery.setFirstResult(page * size);
        typedQuery.setMaxResults(size);

        return typedQuery.getResultList();
    }

    @Transactional
    public PublicPriority updateProgress(UUID id, int progress) {
        PublicPriority priority = em.find(PublicPriority.class, id);
        if (priority != null) {
            priority.setProgress(progress);
            if (progress >= 100) {
                priority.setStatus(ma.medinalink.entity.PriorityStatus.COMPLETED);
            } else if (priority.getStatus() == ma.medinalink.entity.PriorityStatus.PLANNED) {
                priority.setStatus(ma.medinalink.entity.PriorityStatus.IN_PROGRESS);
            }
            em.merge(priority);
        }
        return priority;
    }
}
