const PaymentModel = require("./parent.payments.model");
const InvoiceModel = require("../../admin/invoices/admin.invoices.model");
const ApiError = require("../../../utils/apiError");

exports.payInvoice = async ({ invoice_id, payment_method }) => {
  const invoice = await InvoiceModel.findInvoiceById(invoice_id);

  if (!invoice) {
    throw new ApiError(404, "Invoice not found.");
  }

  if (invoice.status === "PAID") {
    throw new ApiError(400, "Invoice already paid.");
  }

  const paymentId = await PaymentModel.createPayment({
    invoiceId: invoice.id,
    studentId: invoice.student_id,
    amount: invoice.due_amount,
    paymentMethod: payment_method || "MANUAL",
  });

  await PaymentModel.updateInvoice(invoice.id, invoice.total_amount);

  return await PaymentModel.findPaymentById(paymentId);
};

exports.getPaymentHistory = async (studentId) => {
  return await PaymentModel.getPaymentHistory(studentId);
};

exports.getHandbook = async (studentId) => {
  const invoice = await InvoiceModel.findInvoiceByStudentId(studentId);

  if (!invoice) {
    throw new ApiError(404, "Invoice not found.");
  }

  return {
    can_download: invoice.status === "PAID",
    message:
      invoice.status === "PAID"
        ? "Handbook available."
        : "Please complete payment first.",
  };
};