-- ============================================================
--  MedinaLink — SQL Queries for Demo
--  Run inside the PostgreSQL container:
--  docker exec -it medinalink-postgres psql -U medinalink -d medinalink
-- ============================================================


-- ── 1. ALL USERS ─────────────────────────────────────────
SELECT
    id,
    full_name,
    email,
    role,
    is_active,
    created_at
FROM users
ORDER BY created_at DESC;


-- ── 2. ALL REPORTS ───────────────────────────────────────
SELECT
    r.title,
    r.category,
    r.status,
    r.upvotes,
    r.address,
    u.full_name  AS citizen,
    r.created_at
FROM reports r
JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC;


-- ── 3. REPORTS COUNT BY CATEGORY ─────────────────────────
SELECT
    category,
    COUNT(*)  AS total,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM reports
GROUP BY category
ORDER BY total DESC;


-- ── 4. REPORTS COUNT BY STATUS ───────────────────────────
SELECT
    status,
    COUNT(*) AS total
FROM reports
GROUP BY status
ORDER BY total DESC;


-- ── 5. TOP 5 MOST VOTED REPORTS (citizens' priorities) ───
SELECT
    r.title,
    r.category,
    r.status,
    r.upvotes,
    r.address,
    u.full_name AS reported_by
FROM reports r
JOIN users u ON r.user_id = u.id
ORDER BY r.upvotes DESC
LIMIT 5;


-- ── 6. PENDING REPORTS — most urgent first ───────────────
SELECT
    r.title,
    r.category,
    r.upvotes,
    u.full_name  AS citizen,
    r.created_at
FROM reports r
JOIN users u ON r.user_id = u.id
WHERE r.status = 'PENDING'
ORDER BY r.upvotes DESC, r.created_at ASC;


-- ── 7. REPORTS PER CITIZEN ───────────────────────────────
SELECT
    u.full_name,
    u.email,
    COUNT(r.id) AS reports_submitted
FROM users u
LEFT JOIN reports r ON r.user_id = u.id
WHERE u.role = 'CITIZEN'
GROUP BY u.id, u.full_name, u.email
ORDER BY reports_submitted DESC;


-- ── 8. AGENT ACTIVITY (who resolved what) ────────────────
SELECT
    u.full_name   AS agent_name,
    r.title       AS report_title,
    r.category,
    r.status,
    r.updated_at  AS last_action
FROM reports r
JOIN users u ON r.user_id = u.id
WHERE r.status IN ('RESOLVED', 'IN_PROGRESS', 'REJECTED')
ORDER BY r.updated_at DESC;


-- ── 9. PUBLIC PRIORITIES ─────────────────────────────────
SELECT
    pp.title,
    pp.category,
    pp.status,
    pp.progress  AS progress_percent,
    pp.budget,
    pp.zone,
    pp.start_date,
    pp.end_date,
    u.full_name   AS responsible
FROM public_priorities pp
LEFT JOIN users u ON pp.responsible_id = u.id
ORDER BY pp.created_at DESC;


-- ── 10. IF FUNCTION — priorité & étiquette de signalement ──
-- PostgreSQL n'a pas IF() comme MySQL ; on utilise CASE WHEN … THEN … ELSE … END
-- qui joue exactement le même rôle : retourner une valeur selon une condition.
--
-- Syntaxe générale :
--   CASE WHEN <condition> THEN <valeur_si_vrai>
--        WHEN <condition2> THEN <valeur_si_vrai2>
--        ELSE <valeur_par_défaut>
--   END
--
-- Ici on calcule deux colonnes calculées en temps réel :
--   • priorite   → "URGENT" si upvotes >= 5, sinon "NORMAL"
--   • traitement → message lisible selon le statut du rapport
SELECT
    r.title,
    r.category,
    r.status,
    r.upvotes,

    -- colonne 1 : niveau de priorité basé sur le nombre de votes
    CASE WHEN r.upvotes >= 5 THEN 'URGENT'
         ELSE 'NORMAL'
    END AS priorite,

    -- colonne 2 : étiquette lisible du statut (IF imbriqué = CASE à plusieurs branches)
    CASE r.status
        WHEN 'PENDING'     THEN 'En attente de traitement'
        WHEN 'IN_PROGRESS' THEN 'En cours de résolution'
        WHEN 'RESOLVED'    THEN 'Problème résolu'
        WHEN 'REJECTED'    THEN 'Signalement rejeté'
        ELSE                    'Statut inconnu'
    END AS statut_lisible,

    u.full_name AS citoyen
FROM reports r
JOIN users u ON r.user_id = u.id
ORDER BY r.upvotes DESC, r.created_at ASC;


-- ── 11. DASHBOARD SUMMARY (one query) ────────────────────
SELECT
    (SELECT COUNT(*) FROM reports)                                 AS total_reports,
    (SELECT COUNT(*) FROM reports WHERE status = 'PENDING')        AS pending,
    (SELECT COUNT(*) FROM reports WHERE status = 'IN_PROGRESS')    AS in_progress,
    (SELECT COUNT(*) FROM reports WHERE status = 'RESOLVED')       AS resolved,
    (SELECT COUNT(*) FROM reports WHERE status = 'REJECTED')       AS rejected,
    (SELECT COUNT(*) FROM users   WHERE role   = 'CITIZEN')        AS citizens,
    (SELECT COUNT(*) FROM users   WHERE role   = 'AGENT')          AS agents,
    (SELECT COUNT(*) FROM public_priorities)                        AS priorities;
