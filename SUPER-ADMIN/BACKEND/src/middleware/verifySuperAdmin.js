const verifyInternalStaff = require('./verifyInternalStaff');

const verifySuperAdmin = async (req, res, next) => {
  return verifyInternalStaff(req, res, () => {
    if (req.staffUser?.internal_role !== 'super_admin') {
      return res.status(403).json({ error: 'Super admin access required.' });
    }

    return next();
  });
};

module.exports = verifySuperAdmin;