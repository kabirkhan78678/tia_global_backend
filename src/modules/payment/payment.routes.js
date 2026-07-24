const express = require('express');
const router = express.Router();

const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');
const { verifyAdminToken } = require('../../middlewares/admin.middleware');

const {
  getInvoices,
  getInvoiceById,
  processPayment,
  confirmManualPayment,
  getPaymentHistory,
  getReceipt,
  getAcademies,
  createAcademy,
  updateAcademy,
  getGradeLevels,
  createGradeLevel,
  updateGradeLevel,
  getFeeComponents,
  createFeeComponent,
  updateFeeComponent,
  getFeePlansConfig,
  getFeePlanConfigById,
  createFeePlanConfig,
  updateFeePlanConfig,
  createFeePlan,
  getFeePlans,
  getFeePlanById,
  getDiscounts,
  createDiscount,
  updateDiscount,
} = require('./payment.controller');

// --- Academies CRUD ---
router.get('/academies', getAcademies);
router.post('/academies', verifyAdminToken, createAcademy);
router.put('/academies/:id', verifyAdminToken, updateAcademy);

// --- Grade Levels CRUD ---
router.get('/grade-levels', getGradeLevels);
router.post('/grade-levels', verifyAdminToken, createGradeLevel);
router.put('/grade-levels/:id', verifyAdminToken, updateGradeLevel);

// --- Fee Components CRUD ---
router.get('/fee-components', getFeeComponents);
router.post('/fee-components', verifyAdminToken, createFeeComponent);
router.put('/fee-components/:id', verifyAdminToken, updateFeeComponent);

// --- Fee Plans Config CRUD ---
router.get('/fee-plans', getFeePlansConfig);
router.get('/fee-plans/:id', getFeePlanConfigById);
router.post('/fee-plans', verifyAdminToken, createFeePlanConfig);
router.put('/fee-plans/:id', verifyAdminToken, updateFeePlanConfig);

// --- Legacy Fee Plans (Fallback routes) ---
router.post('/legacy-plans', verifyAdminToken, createFeePlan);
router.get('/legacy-plans', getFeePlans);
router.get('/legacy-plans/:id', getFeePlanById);

// --- Discounts CRUD ---
router.get('/discounts', getDiscounts);
router.post('/discounts', verifyAdminToken, createDiscount);
router.put('/discounts/:id', verifyAdminToken, updateDiscount);

// --- Protected Payment & Invoice Routes (Parent, Student, Admin) ---
router.use(verifyToken);

router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/pay', authorizeRoles('parent'), processPayment);
router.post('/manual/confirm', confirmManualPayment);
router.get('/history', authorizeRoles('parent'), getPaymentHistory);
router.get('/receipt/:invoiceId', getReceipt);

module.exports = router;
