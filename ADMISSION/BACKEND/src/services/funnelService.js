import pool from '../../config/db.js';

export async function getAdmissionFunnel(schoolId) {
  const query = `
    SELECT
      COUNT(DISTINCT l.id) AS inquiry,
      COUNT(DISTINCT l.id) FILTER (WHERE l.follow_up_status = 'contacted') AS contacted,
      COUNT(DISTINCT l.id) FILTER (WHERE l.follow_up_status = 'interested') AS interested,
      COUNT(DISTINCT l.id) FILTER (WHERE l.follow_up_status = 'visit') AS visit,
      COUNT(DISTINCT a.lead_id) AS applied,
      COUNT(DISTINCT a.lead_id) FILTER (WHERE a.status = 'approved') AS enrolled
    FROM lead l
    LEFT JOIN application a ON a.lead_id = l.id
    WHERE l.school_id = $1
  `;
  try {
    console.log('🔍 [Funnel Service] Running query for schoolId:', schoolId);
    const { rows } = await pool.query(query, [schoolId]);
    const funnel = rows[0];
    console.log('📦 [Funnel Service] Raw DB Result:', funnel);
    // Ensure all values are numbers and not null
    const result = {
      inquiry: Number(funnel.inquiry) || 0,
      contacted: Number(funnel.contacted) || 0,
      interested: Number(funnel.interested) || 0,
      visit: Number(funnel.visit) || 0,
      applied: Number(funnel.applied) || 0,
      enrolled: Number(funnel.enrolled) || 0,
    };
    console.log('✅ [Funnel Service] Processed Result:', result);
    return result;
  } catch (err) {
    console.error('[Funnel] Error:', err);
    throw err;
  }
}
