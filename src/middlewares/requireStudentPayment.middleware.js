const PaymentModel = require('../modules/payment/payment.model');
const InvoiceModel = require('../modules/payment/payment.model');

/**
 * Access Control Middleware: Require paid invoice for student academic features.
 */
const requireStudentPayment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // Token verification handled earlier
    }

    // Role: STUDENT
    if (req.user.role === 'student') {
      const studentId = req.user.id;
      const isPaid = await PaymentModel.hasPaidInvoice(studentId);

      if (!isPaid) {
        const pendingInvoice = await InvoiceModel.findPendingInvoiceByStudentId(studentId);
        const invoiceStatus = pendingInvoice ? pendingInvoice.invoice_status : 'pending';

        return res.status(403).json({
          success: false,
          payment_required: true,
          invoice_status: invoiceStatus,
          message: 'Payment required before accessing academic resources.',
        });
      }
    }

    // Role: PARENT (when accessing specific student's resources)
    if (req.user.role === 'parent') {
      const studentId = req.query.studentId || req.params.studentId;

      if (studentId) {
        const isPaid = await PaymentModel.hasPaidInvoice(parseInt(studentId, 10));

        if (!isPaid) {
          const pendingInvoice = await InvoiceModel.findPendingInvoiceByStudentId(parseInt(studentId, 10));
          const invoiceStatus = pendingInvoice ? pendingInvoice.invoice_status : 'pending';

          return res.status(403).json({
            success: false,
            payment_required: true,
            invoice_status: invoiceStatus,
            message: 'Payment required before accessing academic resources for this student.',
          });
        }
      }
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  requireStudentPayment,
};
