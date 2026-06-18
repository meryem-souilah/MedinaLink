package ma.medinalink.repository;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import ma.medinalink.entity.ReportStatusHistory;

import java.util.List;
import java.util.UUID;

@ApplicationScoped
public class ReportStatusHistoryRepository {

    @PersistenceContext(unitName = "medinalinkPU")
    private EntityManager em;

    @Transactional
    public ReportStatusHistory save(ReportStatusHistory history) {
        em.persist(history);
        return history;
    }

    public List<ReportStatusHistory> findByReportId(UUID reportId) {
        return em.createQuery(
            "SELECT h FROM ReportStatusHistory h WHERE h.report.id = :reportId ORDER BY h.changedAt ASC",
            ReportStatusHistory.class)
            .setParameter("reportId", reportId)
            .getResultList();
    }
}
