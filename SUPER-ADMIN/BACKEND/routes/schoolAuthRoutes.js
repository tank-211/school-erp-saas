const express = require('express');
const verifySchoolSubscription = require('../src/middleware/verifySchoolSubscription');
const { schoolLogin } = require('../controllers/schoolAuthController');

const { createLoginLimiter } = require('../utils/loginLimiter');

const router = express.Router();

// 10 failed attempts per IP + email, 50 per IP, in 15 minutes
const schoolLoginLimiter = createLoginLimiter();

router.post('/login', schoolLoginLimiter, verifySchoolSubscription, schoolLogin);

module.exports = router;
module.exports.schoolLoginLimiter = schoolLoginLimiter;
