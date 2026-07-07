import pool from '../../config/db.js';

// Helper to log and return 0 if null
const safeNumber = (val) => (val === null ? 0 : Number(val));

const dashboardService = {
  async getTotalInquiries(schoolId) {
    try {
      const { rows } = await pool.query(
        'SELECT COUNT(*) AS total FROM lead WHERE school_id = $1',[schoolId]
      );
      console.log('[Dashboard] getTotalInquiries:', rows[0].total);
      // console.log(rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getTotalInquiries:', err);
      throw err;
    }
  },

  async getConversionRate(schoolId) {
    try {
      const { rows } = await pool.query(
        `SELECT ROUND((COUNT(DISTINCT a.lead_id)::decimal / NULLIF(COUNT(DISTINCT l.id),0)) * 100, 2) AS conversion_rate
         FROM lead l
         LEFT JOIN application a ON a.lead_id = l.id
         WHERE l.school_id = $1`,
        [schoolId]
      );
      const rate = rows[0].conversion_rate;
      console.log('[Dashboard] getConversionRate:', rate);
      return safeNumber(rate);
    } catch (err) {
      console.error('Error in getConversionRate:', err);
      throw err;
    }
  },

  async getActiveLeads(schoolId) {
    try {
      const { rows } = await pool.query(
        "SELECT COUNT(*) AS total FROM lead WHERE follow_up_status IN ('pending', 'contacted', 'interested') AND school_id = $1",
        [schoolId]
      );
      console.log('[Dashboard] getActiveLeads:', rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getActiveLeads:', err);
      throw err;
    }
  },

  async getEnrolledStudents(schoolId) {
    try {
      const { rows } = await pool.query(
        "SELECT COUNT(*) AS total FROM application WHERE status = 'approved' AND school_id = $1",
        [schoolId]
      );
      console.log('[Dashboard] getEnrolledStudents:', rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getEnrolledStudents:', err);
      throw err;
    }
  },

  async getPendingApplications(schoolId) {
    try {
      const { rows } = await pool.query(
        "SELECT COUNT(*) AS total FROM application WHERE status = 'in_progress' AND school_id = $1",
        [schoolId]
      );
      console.log('[Dashboard] getPendingApplications:', rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getPendingApplications:', err);
      throw err;
    }
  },

  async getOffersSent(schoolId) {
    try {
      const { rows } = await pool.query(
        "SELECT COUNT(*) AS total FROM application WHERE status = 'approved' AND school_id = $1",
        [schoolId]
      );
      console.log('[Dashboard] getOffersSent:', rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getOffersSent:', err);
      throw err;
    }
  },

  async getFeesCollected(schoolId) {
    try {
      const { rows } = await pool.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM payment WHERE status = 'successful' AND school_id = $1",
        [schoolId]
      );
      console.log('[Dashboard] getFeesCollected:', rows[0].total);
      return safeNumber(rows[0].total);
    } catch (err) {
      console.error('Error in getFeesCollected:', err);
      throw err;
    }
  },

  async getMonthlyTrend(schoolId) {
    try {
      const query = `
        WITH months AS (
          SELECT 
            DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months' + 
            (INTERVAL '1 month' * generate_series(0,5)) AS month_start
        )
        SELECT 
          TO_CHAR(m.month_start, 'Mon') AS month,
          COALESCE(l.inquiries, 0)::integer AS inquiries,
          COALESCE(a.enrollments, 0)::integer AS enrollments
        FROM months m
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('month', created_at) AS month,
            COUNT(*) AS inquiries
          FROM lead
          WHERE school_id = $1
          GROUP BY month
        ) l ON l.month = m.month_start
        LEFT JOIN (
          SELECT 
            DATE_TRUNC('month', admission_date) AS month,
            COUNT(*) AS enrollments
          FROM admission
          WHERE school_id = $1
            AND status = 'active'
          GROUP BY month
        ) a ON a.month = m.month_start
        ORDER BY m.month_start;
      `;
      const { rows } = await pool.query(query, [schoolId]);
      console.log('[Dashboard] getMonthlyTrend:', rows.length, 'months fetched');
      return rows;
    } catch (err) {
      console.error('Error in getMonthlyTrend:', err);
      throw err;
    }
  },

  async getGradeDistribution(schoolId) {
    try {
      const query = `
        SELECT
          sc.class_name AS label,
          COUNT(a.id)::integer AS value
        FROM school_class sc
        LEFT JOIN admission a
          ON a.class_id = sc.id
         AND a.school_id = sc.school_id
         AND a.status IN ('active', 'submitted')
        WHERE sc.school_id = $1
        GROUP BY sc.id, sc.class_name, sc.class_numeric_value
        HAVING COUNT(a.id) > 0
        ORDER BY sc.class_numeric_value ASC, sc.class_name ASC;
      `;
      const { rows } = await pool.query(query, [schoolId]);
      return rows;
    } catch (err) {
      console.error('Error in getGradeDistribution:', err);
      throw err;
    }
  },

  async getCounselorPerformance(schoolId) {
    try {
      const query = `
        SELECT
          u.id,
          u.name,
          COUNT(l.id)::integer AS leads,
          COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN l.id END)::integer AS conversions,
          COALESCE(
            ROUND(
              (
                COUNT(DISTINCT CASE WHEN a.id IS NOT NULL THEN l.id END)::numeric
                / NULLIF(COUNT(l.id), 0)
              ) * 100,
              0
            ),
            0
          )::integer AS pct
        FROM app_user u
        LEFT JOIN lead l
          ON l.school_id = u.school_id
         AND l.assigned_to IS NOT NULL
         AND (
           l.assigned_to::text = u.id::text
           OR l.assigned_to::text = u.name
         )
        LEFT JOIN application a
          ON a.school_id = l.school_id
         AND a.lead_id = l.id
        WHERE u.school_id = $1
          AND u.status = 'active'
          AND u.role IN ('counselor', 'admin')
        GROUP BY u.id, u.name
        HAVING COUNT(l.id) > 0
        ORDER BY pct DESC, conversions DESC, leads DESC, u.name ASC
        LIMIT 6;
      `;
      const { rows } = await pool.query(query, [schoolId]);
      return rows;
    } catch (err) {
      console.error('Error in getCounselorPerformance:', err);
      throw err;
    }
  },
};

export default dashboardService;
