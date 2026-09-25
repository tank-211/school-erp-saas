const express = require('express');
const router = express.Router();
const verifyInternalStaff = require('../src/middleware/verifyInternalStaff');
const { login } = require('../controllers/superAdminAuthController');
const { getAllSchools, getStats, createSchool, updateSchool } = require('../controllers/superAdminSchoolController');
const { getAllStaff, createStaff } = require('../controllers/superAdminStaffController');
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
router.post('/login', login);

// Protected routes
router.options('/stats', (req, res) => res.sendStatus(204));
router.options('/schools/:id/renew', (req, res) => res.sendStatus(204));
router.options('/schools/:id/renewals', (req, res) => res.sendStatus(204));
router.get('/schools', verifyInternalStaff, getAllSchools);
router.post('/schools', verifyInternalStaff, createSchool);
router.patch('/schools/:id', verifyInternalStaff, updateSchool);
router.get('/stats', verifyInternalStaff, getStats);
router.get('/staff', verifyInternalStaff, getAllStaff);
router.post('/staff', verifyInternalStaff, createStaff);
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

router.post(
  "/payment-gateway",
  verifyInternalStaff,
  createPaymentGateway
);

router.patch(
  "/payment-gateway",
  verifyInternalStaff,
  updatePaymentGateway
);

router.post(
  "/payment-gateway/test",
  verifyInternalStaff,
  testPaymentGateway
);

module.exports = router;
