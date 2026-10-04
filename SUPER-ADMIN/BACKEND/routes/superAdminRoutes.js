const express = require('express');
const router = express.Router();
const { createLoginLimiter } = require('../utils/loginLimiter');
// Staff login: 10 failed attempts per IP + email, 50 per IP, in 15 minutes
const staffLoginLimiter = createLoginLimiter();
const verifyInternalStaff = require('../src/middleware/verifyInternalStaff');
const verifySuperAdmin = require('../src/middleware/verifySuperAdmin');
const { login } = require('../controllers/superAdminAuthController');
const { getAllSchools, getSchoolById, getStats, createSchool, updateSchool } = require('../controllers/superAdminSchoolController');
const {
  getSchoolGateway,
  saveSchoolGateway,
  testSchoolGateway,
  disconnectSchoolGateway,
} = require('../controllers/schoolPaymentGatewayController');
const { getAllStaff, createStaff, updateStaff } = require('../controllers/superAdminStaffController');
const { renewSchoolSubscription, getSchoolRenewals } = require('../controllers/superAdminBillingController');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} = require('../controllers/superAdminUserController');

const {
  getPaymentGateway,
  createPaymentGateway,
  updatePaymentGateway,
  testPaymentGateway,
} = require("../controllers/superAdminPaymentGatewayController");

// Auth (no middleware needed)
router.options('/login', (req, res) => res.sendStatus(204));
router.post('/login', staffLoginLimiter, login);

// Protected routes
router.options('/stats', (req, res) => res.sendStatus(204));
router.options('/schools/:id/renew', (req, res) => res.sendStatus(204));
router.options('/schools/:id/renewals', (req, res) => res.sendStatus(204));
router.get('/schools', verifyInternalStaff, getAllSchools);
router.post('/schools', verifyInternalStaff, createSchool);
router.get('/schools/:id', verifyInternalStaff, getSchoolById);
// Each school's own Razorpay account: any staff can view, only super admins change it
router.options('/schools/:id/payment-gateway', (req, res) => res.sendStatus(204));
router.options('/schools/:id/payment-gateway/test', (req, res) => res.sendStatus(204));
router.get('/schools/:id/payment-gateway', verifyInternalStaff, getSchoolGateway);
router.put('/schools/:id/payment-gateway', verifySuperAdmin, saveSchoolGateway);
router.post('/schools/:id/payment-gateway/test', verifySuperAdmin, testSchoolGateway);
router.delete('/schools/:id/payment-gateway', verifySuperAdmin, disconnectSchoolGateway);
router.patch('/schools/:id', verifyInternalStaff, updateSchool);
router.get('/stats', verifyInternalStaff, getStats);
router.get('/staff', verifyInternalStaff, getAllStaff);
// Only a super_admin may create platform staff (any role, incl. super_admin)
router.post('/staff', verifySuperAdmin, createStaff);
router.options('/staff/:id', (req, res) => res.sendStatus(204));
// Only a super_admin may change a staff member's role or deactivate them
router.patch('/staff/:id', verifySuperAdmin, updateStaff);
router.post('/schools/:id/renew', verifyInternalStaff, renewSchoolSubscription);
router.get('/schools/:id/renewals', verifyInternalStaff, getSchoolRenewals);
router.get('/users', verifyInternalStaff, getAllUsers);

router.post('/users', verifyInternalStaff, createUser);

router.patch('/users/:id', verifyInternalStaff, updateUser);

router.delete('/users/:id', verifyInternalStaff, deleteUser);

router.post(
  '/users/:id/reset-password',
  verifyInternalStaff,
  resetUserPassword
);

// Payment Gateway
router.get(
  "/payment-gateway",
  verifyInternalStaff,
  getPaymentGateway
);

// Platform payment credentials: super_admin only
router.post(
  "/payment-gateway",
  verifySuperAdmin,
  createPaymentGateway
);

router.patch(
  "/payment-gateway",
  verifySuperAdmin,
  updatePaymentGateway
);

// Writes the gateway status, so super_admin only like the other changes
router.post(
  "/payment-gateway/test",
  verifySuperAdmin,
  testPaymentGateway
);

module.exports = router;
module.exports.staffLoginLimiter = staffLoginLimiter;
