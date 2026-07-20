const express = require("express");

const router = express.Router();

const InvoiceController = require("./admin.invoices.controller");
const { verifyAdminToken } = require("../../../middlewares/admin.middleware");

router.get("/", verifyAdminToken, InvoiceController.getAllInvoices);

router.get("/:id", verifyAdminToken, InvoiceController.getInvoiceById);

router.patch("/:id", verifyAdminToken, InvoiceController.updateInvoice);

module.exports = router;