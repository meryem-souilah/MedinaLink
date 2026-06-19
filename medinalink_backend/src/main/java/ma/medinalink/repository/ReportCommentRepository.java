package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.ReportComment;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReportCommentRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    @Transactional
    public ReportComment save(ReportComment comment) {
        em.persist(comment);
        return comment;
    }

    public List<ReportComment> findByReportId(UUID reportId) {
        return em.createQuery(
            "SELECT c FROM ReportComment c WHERE c.reportId = :reportId ORDER BY c.createdAt ASC",
            ReportComment.class)
            .setParameter("reportId", reportId)
            .getResultList();
    }

    public long countByReportId(UUID reportId) {
        return em.createQuery(
            "SELECT COUNT(c) FROM ReportComment c WHERE c.reportId = :reportId",
            Long.class)
            .setParameter("reportId", reportId)
            .getSingleResult();
    }
}
