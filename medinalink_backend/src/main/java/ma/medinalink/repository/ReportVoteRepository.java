package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.ReportVote;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReportVoteRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    public boolean hasVoted(UUID userId, UUID reportId) {
        Long count = em.createQuery(
            "SELECT COUNT(v) FROM ReportVote v WHERE v.userId = :userId AND v.reportId = :reportId",
            Long.class)
            .setParameter("userId", userId)
            .setParameter("reportId", reportId)
            .getSingleResult();
        return count > 0;
    }

    @Transactional
    public void save(UUID userId, UUID reportId) {
        ReportVote vote = new ReportVote();
        vote.setUserId(userId);
        vote.setReportId(reportId);
        em.persist(vote);
    }

    public List<UUID> findReportIdsByUser(UUID userId) {
        return em.createQuery(
            "SELECT v.reportId FROM ReportVote v WHERE v.userId = :userId",
            UUID.class)
            .setParameter("userId", userId)
            .getResultList();
    }
}
