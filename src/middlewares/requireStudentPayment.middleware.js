/**
 * Access Control Middleware: Require paid invoice for student academic features. (DEACTIVATED)
 */
const requireStudentPayment = async (req, res, next) => {
  return next();
};

module.exports = {
  requireStudentPayment,
};
