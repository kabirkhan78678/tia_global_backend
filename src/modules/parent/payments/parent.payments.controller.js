const PaymentService = require("./parent.payments.service");

exports.payInvoice = async (req, res, next) => {
  try {
    const payment = await PaymentService.payInvoice(req.body);

    return res.status(200).json({
      success: true,
      message: "Payment successful.",
      data: payment,
    });
  } catch (err) {
    next(err);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const payments = await PaymentService.getPaymentHistory(
      req.params.studentId
    );

    return res.status(200).json({
      success: true,
      message: "Payment history fetched successfully.",
      data: payments,
    });
  } catch (err) {
    next(err);
  }
};

exports.getHandbook = async (req, res, next) => {
  try {
    const handbook = await PaymentService.getHandbook(
      req.params.studentId
    );

    return res.status(200).json({
      success: true,
      data: handbook,
    });
  } catch (err) {
    next(err);
  }
};