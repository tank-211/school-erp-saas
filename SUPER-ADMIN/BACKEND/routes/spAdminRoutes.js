const express = require('express');
const verifySuperAdmin = require('../src/middleware/verifySuperAdmin');
const { signup } = require('../controllers/spAdminController');

const router = express.Router();

router.post('/signup', verifySuperAdmin, signup);

module.exports = router;