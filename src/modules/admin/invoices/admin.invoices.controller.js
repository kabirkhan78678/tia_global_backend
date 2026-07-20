const InvoiceService = require("./admin.invoices.service");

exports.getAllInvoices = async (req, res, next) => {
  try {
    const invoices = await InvoiceService.getAllInvoices();

    return res.status(200).json({
      success: true,
      message: "Invoices fetched successfully.",
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await InvoiceService.getInvoiceById(id);

    return res.status(200).json({
      success: true,
      message: "Invoice fetched successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await InvoiceService.updateInvoice(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Invoice updated successfully.",
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};