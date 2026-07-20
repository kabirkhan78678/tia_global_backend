const InvoiceModel = require("./admin.invoices.model");
const ApiError = require("../../../utils/apiError");

exports.getAllInvoices = async () => {
  return await InvoiceModel.findAllInvoices();
};

exports.getInvoiceById = async (invoiceId) => {
  const invoice = await InvoiceModel.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new ApiError(404, "Invoice not found.");
  }

  return invoice;
};

exports.updateInvoice = async (invoiceId, body) => {
  const invoice = await InvoiceModel.findInvoiceById(invoiceId);

  if (!invoice) {
    throw new ApiError(404, "Invoice not found.");
  }

  const {
    tuition_fee,
    book_fee,
    total_amount,
    paid_amount,
    due_amount,
    status,
    due_date,
  } = body;

  await InvoiceModel.updateInvoice({
    invoiceId,
    tuitionFee: tuition_fee,
    bookFee: book_fee,
    totalAmount: total_amount,
    paidAmount: paid_amount,
    dueAmount: due_amount,
    status,
    dueDate: due_date,
  });

  return await InvoiceModel.findInvoiceById(invoiceId);
};

exports.createStudentInvoice = async (studentId) => {
  const existingInvoice =
    await InvoiceModel.findInvoiceByStudentId(studentId);

  if (existingInvoice) {
    return existingInvoice;
  }

  const tuitionFee = 300;
  const bookFee = 50;

  const totalAmount = tuitionFee + bookFee;

  const invoiceNumber = `INV-${Date.now()}`;

  const currentYear = new Date().getFullYear();

  const academicYear = `${currentYear}-${currentYear + 1}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  const invoiceId = await InvoiceModel.createInvoice({
    studentId,
    invoiceNumber,
    academicYear,
    invoiceType: "ADMISSION",
    tuitionFee,
    bookFee,
    totalAmount,
    paidAmount: 0,
    dueAmount: totalAmount,
    status: "PENDING",
    dueDate,
  });

  return await InvoiceModel.findInvoiceById(invoiceId);
};