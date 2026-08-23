const express = require('express');
const verifySchoolSubscription = require('../src/middleware/verifySchoolSubscription');
const { schoolLogin } = require('../controllers/schoolAuthController');

const router = express.Router();

router.post('/login', verifySchoolSubscription, schoolLogin);

module.exports = router;
