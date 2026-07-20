const express = require("express");

const router = express.Router();

const PaymentController = require("./parent.payments.controller");

// POST /api/parent/payments/pay
router.post("/pay", PaymentController.payInvoice);

// GET /api/parent/payments/history/:studentId
router.get("/history/:studentId", PaymentController.getPaymentHistory);

// GET /api/parent/payments/handbook/:studentId
router.get("/handbook/:studentId", PaymentController.getHandbook);

module.exports = router;