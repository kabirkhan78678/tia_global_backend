const InvoiceService = require('../../services/invoice.service');
const PaymentService = require('./payment.service');
const FeePlanConfigService = require('../../services/feePlanConfig.service');
const FeePlanModel = require('./payment.model');
const {
  validatePayInput,
  validateManualConfirmInput,
  validateFeePlanInput,
} = require('../../utils/payment.validator');

// ==========================================
// 1. INVOICES & PAYMENTS HANDLERS
// ==========================================

exports.getInvoices = async (req, res, next) => {
  try {
    let invoices = [];
    if (req.user.role === 'parent') {
      invoices = await InvoiceService.getInvoicesForParent(req.user.id);
    } else {
      invoices = await InvoiceService.getAllInvoices();
    }
    return res.status(200).json({ success: true, data: invoices });
  } catch (error) {
    return next(error);
  }
};

exports.getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await InvoiceService.getInvoiceById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: invoice });
  } catch (error) {
    return next(error);
  }
};

exports.processPayment = async (req, res, next) => {
  try {
    validatePayInput(req.body);
    const parentId = req.user.id;
    const result = await PaymentService.processPayment({
      invoice_id: req.body.invoice_id,
      parent_id: parentId,
      provider: req.body.provider,
      payment_method: req.body.payment_method,
    });
    return res.status(200).json({ success: true, message: 'Payment initiated successfully', data: result });
  } catch (error) {
    return next(error);
  }
};

exports.confirmManualPayment = async (req, res, next) => {
  try {
    validateManualConfirmInput(req.body);
    const result = await PaymentService.confirmPayment({
      invoice_id: req.body.invoice_id,
      transaction_reference: req.body.transaction_reference,
      notes: req.body.notes,
      provider: 'manual',
    });
    return res.status(200).json({ success: true, message: result.message, data: result });
  } catch (error) {
    return next(error);
  }
};

exports.getPaymentHistory = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const history = await PaymentService.getPaymentHistory(parentId);
    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return next(error);
  }
};

exports.getReceipt = async (req, res, next) => {
  try {
    const receipt = await PaymentService.getReceipt(req.params.invoiceId, req.user);
    return res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    return next(error);
  }
};


// ==========================================
// 2. CONFIGURABLE FEE SYSTEM ADMIN HANDLERS
// ==========================================

// Academies
exports.getAcademies = async (req, res, next) => {
  try {
    const academies = await FeePlanConfigService.getAcademies();
    return res.status(200).json({ success: true, data: academies });
  } catch (error) {
    return next(error);
  }
};

exports.createAcademy = async (req, res, next) => {
  try {
    const academy = await FeePlanConfigService.createAcademy(req.body);
    return res.status(201).json({ success: true, message: 'Academy created successfully', data: academy });
  } catch (error) {
    return next(error);
  }
};

exports.updateAcademy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const academy = await FeePlanConfigService.updateAcademy(id, req.body);
    return res.status(200).json({ success: true, message: 'Academy updated successfully', data: academy });
  } catch (error) {
    return next(error);
  }
};

// Grade Levels
exports.getGradeLevels = async (req, res, next) => {
  try {
    const gradeLevels = await FeePlanConfigService.getGradeLevels();
    return res.status(200).json({ success: true, data: gradeLevels });
  } catch (error) {
    return next(error);
  }
};

exports.createGradeLevel = async (req, res, next) => {
  try {
    const gradeLevel = await FeePlanConfigService.createGradeLevel(req.body);
    return res.status(201).json({ success: true, message: 'Grade level created successfully', data: gradeLevel });
  } catch (error) {
    return next(error);
  }
};

exports.updateGradeLevel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const gradeLevel = await FeePlanConfigService.updateGradeLevel(id, req.body);
    return res.status(200).json({ success: true, message: 'Grade level updated successfully', data: gradeLevel });
  } catch (error) {
    return next(error);
  }
};

// Fee Components
exports.getFeeComponents = async (req, res, next) => {
  try {
    const components = await FeePlanConfigService.getFeeComponents();
    return res.status(200).json({ success: true, data: components });
  } catch (error) {
    return next(error);
  }
};

exports.createFeeComponent = async (req, res, next) => {
  try {
    const component = await FeePlanConfigService.createFeeComponent(req.body);
    return res.status(201).json({ success: true, message: 'Fee component created successfully', data: component });
  } catch (error) {
    return next(error);
  }
};

exports.updateFeeComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const component = await FeePlanConfigService.updateFeeComponent(id, req.body);
    return res.status(200).json({ success: true, message: 'Fee component updated successfully', data: component });
  } catch (error) {
    return next(error);
  }
};

// Fee Plans Config
exports.getFeePlansConfig = async (req, res, next) => {
  try {
    const feePlans = await FeePlanConfigService.getFeePlans();
    return res.status(200).json({ success: true, data: feePlans });
  } catch (error) {
    return next(error);
  }
};

exports.getFeePlanConfigById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const feePlan = await FeePlanConfigService.getFeePlanById(id);
    return res.status(200).json({ success: true, data: feePlan });
  } catch (error) {
    return next(error);
  }
};

exports.createFeePlanConfig = async (req, res, next) => {
  try {
    const feePlan = await FeePlanConfigService.createFeePlan(req.body);
    return res.status(201).json({ success: true, message: 'Fee plan created successfully', data: feePlan });
  } catch (error) {
    return next(error);
  }
};

exports.updateFeePlanConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const feePlan = await FeePlanConfigService.updateFeePlan(id, req.body);
    return res.status(200).json({ success: true, message: 'Fee plan updated successfully', data: feePlan });
  } catch (error) {
    return next(error);
  }
};

// Legacy Fee Plans
exports.createFeePlan = async (req, res, next) => {
  try {
    validateFeePlanInput(req.body);
    const feePlanId = await FeePlanModel.createFeePlan(req.body);
    const feePlan = await FeePlanModel.findFeePlanById(feePlanId);
    return res.status(201).json({ success: true, message: 'Fee Plan created successfully', data: feePlan });
  } catch (error) {
    return next(error);
  }
};

exports.getFeePlans = async (req, res, next) => {
  try {
    const feePlans = await FeePlanModel.findAllFeePlans();
    return res.status(200).json({ success: true, data: feePlans });
  } catch (error) {
    return next(error);
  }
};

exports.getFeePlanById = async (req, res, next) => {
  try {
    const feePlan = await FeePlanModel.findFeePlanById(req.params.id);
    return res.status(200).json({ success: true, data: feePlan });
  } catch (error) {
    return next(error);
  }
};

// Discounts Config
exports.getDiscounts = async (req, res, next) => {
  try {
    const discounts = await FeePlanConfigService.getDiscounts();
    return res.status(200).json({ success: true, data: discounts });
  } catch (error) {
    return next(error);
  }
};

exports.createDiscount = async (req, res, next) => {
  try {
    const discount = await FeePlanConfigService.createDiscount(req.body);
    return res.status(201).json({ success: true, message: 'Discount created successfully', data: discount });
  } catch (error) {
    return next(error);
  }
};

exports.updateDiscount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const discount = await FeePlanConfigService.updateDiscount(id, req.body);
    return res.status(200).json({ success: true, message: 'Discount updated successfully', data: discount });
  } catch (error) {
    return next(error);
  }
};
