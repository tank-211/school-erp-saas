import express from 'express';
import * as setup from '../controllers/setupController.js';
import { authMiddleware, isAdmin, requireSchool } from '../middleware/auth.js';

const router = express.Router();

// School setup is school-scoped: requireSchool sets req.schoolId from the token.
router.use(authMiddleware, requireSchool);

// Any school user can read the setup (forms need the years, classes and sections)
router.get('/overview', setup.getSetupOverview);
router.get('/seat-capacity', setup.getSeatCapacity);

// Changes are for school admins only (isAdmin re-checks the role in the database)
router.post('/academic-years', isAdmin, setup.createAcademicYear);
router.patch('/academic-years/:id', isAdmin, setup.updateAcademicYear);
router.post('/academic-years/:id/activate', isAdmin, setup.activateAcademicYear);
router.delete('/academic-years/:id', isAdmin, setup.deleteAcademicYear);

router.post('/classes/bulk', isAdmin, setup.createClassesBulk);
router.post('/classes', isAdmin, setup.createClass);
router.patch('/classes/:id', isAdmin, setup.updateClass);
router.delete('/classes/:id', isAdmin, setup.deleteClass);

router.post('/classes/:id/sections', isAdmin, setup.createSection);
router.patch('/sections/:id', isAdmin, setup.updateSection);
router.delete('/sections/:id', isAdmin, setup.deleteSection);

export default router;
