import { getAdmissionFunnel } from '../services/funnelService.js';

export async function getFunnel(req, res) {
  try {
    let schoolId = req.user?.school_id || req.query.schoolId || req.body.schoolId;
    if (!schoolId) {
      // For production, you may want to restrict this. For dev/demo, fallback to 1.
      console.warn('[Funnel] schoolId missing in request. Using default schoolId=1');
      schoolId = 1;
    }
    console.log('📊 [Funnel API HIT] Fetching funnel for schoolId:', schoolId);
    const funnel = await getAdmissionFunnel(schoolId);
    console.log('📊 [Funnel Data] Returning:', funnel);
    res.json(funnel);
  } catch (err) {
    console.error('[Funnel] Controller error:', err);
    res.status(500).json({ error: 'Failed to fetch admission funnel' });
  }
}
