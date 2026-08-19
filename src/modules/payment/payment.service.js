const InvoiceModel = require('./payment.model');
const PaymentModel = require('./payment.model');
const ManualPaymentProvider = require('../../services/manualPayment.provider');
const StripePaymentProvider = require('../../services/stripePayment.provider');
const ApiError = require('../../utils/apiError');
const { sendPaymentSuccessEmail, sendReceiptEmail } = require('../../services/email.service');
const AuthModel = require('../users/auth/auth.model');

class PaymentService {
  constructor() {
    // Registry of available payment providers
    this.providers = new Map();
    this.registerProvider('manual', new ManualPaymentProvider());
    this.registerProvider('stripe', new StripePaymentProvider());
  }

  /**
   * Register a payment provider dynamically
   */
  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Get registered provider instance
   */
  getProvider(name = 'manual') {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new ApiError(400, `Payment provider '${name}' is not supported or enabled.`);
    }
    return provider;
  }

  /**
   * Initiate / process payment for an invoice
   */
  async processPayment({ invoice_id, student_id, parent_id, provider: providerName = 'manual', payment_method }) {
    let invoicesToPay = [];

    if (invoice_id) {
      const invoice = await InvoiceModel.findInvoiceById(invoice_id);
      if (!invoice) {
        throw new ApiError(404, 'Invoice not found');
      }
      if (invoice.parent_id !== parent_id) {
        throw new ApiError(403, 'Unauthorized access to this invoice');
      }
      if (invoice.invoice_status === 'paid') {
        throw new ApiError(400, 'Invoice is already paid');
      }
      invoicesToPay.push(invoice);
    } else if (student_id) {
      // Verify parent has access to this student
      const students = await AuthModel.findStudentsByParentId(parent_id);
      const hasStudent = students.some(s => s.id === Number(student_id));
      if (!hasStudent) {
        throw new ApiError(403, 'Unauthorized parent-student relationship');
      }
      // Find all pending invoices for this student
      const invoices = await InvoiceModel.findPendingInvoicesByStudentId(student_id);
      invoicesToPay = invoices;
    } else {
      // Find all students linked to the parent, and get all their pending invoices
      const students = await AuthModel.findStudentsByParentId(parent_id);
      for (const student of students) {
        const invoices = await InvoiceModel.findPendingInvoicesByStudentId(student.id);
        invoicesToPay.push(...invoices);
      }
    }

    // Return error if no pending invoices are found (No mock invoices generated anymore)
    if (invoicesToPay.length === 0) {
      throw new ApiError(400, 'No pending invoice found');
    }

    // Stripe checkout session creation path
    if (providerName.toLowerCase() === 'stripe') {
      const providerInstance = this.getProvider('stripe');
      const checkoutSession = await providerInstance.processPayment({
        invoices: invoicesToPay,
        amount: invoicesToPay.reduce((sum, inv) => sum + Number(inv.grand_total), 0),
        currency: invoicesToPay[0].currency,
        parentId: parent_id,
        studentId: student_id || invoicesToPay[0].student_id,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      });

      return checkoutSession;
    }

    const paidInvoices = [];

    for (const invoice of invoicesToPay) {
      if (invoice.invoice_status === 'paid') {
        continue;
      }

      const providerInstance = this.getProvider(providerName);
      const paymentResult = await providerInstance.processPayment({
        invoice,
        amount: invoice.grand_total,
        currency: invoice.currency,
        paymentMethod: payment_method,
      });

      // Mark invoice as PAID
      await InvoiceModel.updateInvoiceStatus(invoice.id, 'paid');

      const transactionId = await PaymentModel.createTransaction({
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        parent_id: invoice.parent_id,
        provider: providerName,
        transaction_reference: paymentResult.transactionReference,
        payment_status: 'success',
        amount: invoice.grand_total,
        currency: invoice.currency,
        payment_date: new Date(),
        gateway_response: paymentResult.meta || null,
      });

      // Send Emails to parent (instant confirmation)
      try {
        const updatedInvoice = await InvoiceModel.findInvoiceById(invoice.id);
        await sendPaymentSuccessEmail({
          to: invoice.parent_email,
          parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
          studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
          invoiceNumber: invoice.invoice_number,
          amountPaid: invoice.grand_total,
          currency: invoice.currency,
          transactionRef: paymentResult.transactionReference,
        });

        await sendReceiptEmail({
          to: invoice.parent_email,
          parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
          studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
          invoiceNumber: invoice.invoice_number,
          amountPaid: invoice.grand_total,
          currency: invoice.currency,
          paidAt: updatedInvoice.paid_at,
          items: invoice.items,
        });
      } catch (err) {
        console.error('Payment notification emails failed:', err.message);
      }

      paidInvoices.push({
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        transaction_id: transactionId,
        payment_status: 'success',
      });
    }

    return {
      success: true,
      message: 'Temporary instant payment completed successfully for all relevant invoices.',
      data: paidInvoices,
    };
  }

  /**
   * Confirm payment and unlock student
   */
  async confirmPayment({ invoice_id, transaction_reference, notes, provider: providerName = 'manual' }) {
    const invoice = await InvoiceModel.findInvoiceById(invoice_id);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (invoice.invoice_status === 'paid') {
      return {
        message: 'Invoice is already marked as paid.',
        invoice,
      };
    }

    const providerInstance = this.getProvider(providerName);

    const confirmResult = await providerInstance.confirmPayment({
      transactionReference: transaction_reference || `MANUAL-${invoice.id}`,
      paymentNotes: notes,
    });

    if (!confirmResult.success) {
      throw new ApiError(400, 'Payment confirmation failed');
    }

    // Mark invoice as PAID
    await InvoiceModel.updateInvoiceStatus(invoice.id, 'paid');

    // Create or update transaction status to SUCCESS
    let transactionId = null;
    if (confirmResult.transactionReference) {
      transactionId = await PaymentModel.createTransaction({
        invoice_id: invoice.id,
        student_id: invoice.student_id,
        parent_id: invoice.parent_id,
        provider: providerName,
        transaction_reference: confirmResult.transactionReference,
        payment_status: 'success',
        amount: invoice.grand_total,
        currency: invoice.currency,
        payment_date: new Date(),
        gateway_response: confirmResult.gatewayResponse,
      });
    }

    const updatedInvoice = await InvoiceModel.findInvoiceById(invoice.id);

    // Send Emails to parent
    try {
      await sendPaymentSuccessEmail({
        to: invoice.parent_email,
        parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
        studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
        invoiceNumber: invoice.invoice_number,
        amountPaid: invoice.grand_total,
        currency: invoice.currency,
        transactionRef: confirmResult.transactionReference,
      });

      await sendReceiptEmail({
        to: invoice.parent_email,
        parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
        studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
        invoiceNumber: invoice.invoice_number,
        amountPaid: invoice.grand_total,
        currency: invoice.currency,
        paidAt: updatedInvoice.paid_at,
        items: invoice.items,
      });
    } catch (err) {
      console.error('Payment notification emails failed:', err.message);
    }

    return {
      success: true,
      message: 'Payment confirmed successfully. Student account activated & features unlocked.',
      transaction_id: transactionId,
      invoice: updatedInvoice,
    };
  }

  /**
   * Get payment receipt for an invoice
   */
  async getReceipt(invoiceId, user) {
    const invoice = await InvoiceModel.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (user.role === 'parent' && invoice.parent_id !== user.id) {
      throw new ApiError(403, 'You can only view receipts for your own children');
    }

    if (user.role === 'student' && invoice.student_id !== user.id) {
      throw new ApiError(403, 'You can only view your own payment receipt');
    }

    if (invoice.invoice_status !== 'paid') {
      throw new ApiError(400, 'Receipt is not available until the invoice is paid.');
    }

    return {
      receipt_number: `REC-${invoice.invoice_number}`,
      invoice_number: invoice.invoice_number,
      student_name: `${invoice.student_first_name} ${invoice.student_last_name}`,
      parent_name: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
      paid_at: invoice.paid_at,
      subtotal: invoice.subtotal,
      discount: invoice.discount,
      tax: invoice.tax,
      grand_total: invoice.grand_total,
      currency: invoice.currency,
      status: invoice.invoice_status,
      items: invoice.items,
    };
  }

  /**
   * Handle Stripe webhook success (completed checkout session or succeeded payment intent)
   */
  async handleStripeWebhookSuccess({ invoice_id, parent_id, student_id, session_id, payment_intent_id, gateway_response }) {
    if (!invoice_id) {
      console.log('[Webhook] No invoice_id found in metadata. Skipping.');
      return;
    }

    const invoiceIds = invoice_id.toString().split(',').map(id => Number(id.trim()));
    const ref = payment_intent_id || session_id;

    for (const invoiceId of invoiceIds) {
      // 1. Fetch Invoice
      const invoice = await InvoiceModel.findInvoiceById(invoiceId);
      if (!invoice) {
        console.warn(`[Webhook] Invoice ${invoiceId} not found during webhook processing.`);
        continue;
      }

      // 2. Idempotency Check: Already paid?
      if (invoice.invoice_status === 'paid') {
        console.log(`[Webhook] Invoice ${invoiceId} is already marked as paid. Skipping.`);
        continue;
      }

      // 3. Idempotency Check: Duplicate transaction reference?
      const existingTxByRef = payment_intent_id ? await PaymentModel.findTransactionByReference(payment_intent_id) : null;
      const existingTxBySession = session_id ? await PaymentModel.findTransactionByReference(session_id) : null;
      if (existingTxByRef || existingTxBySession) {
        console.log(`[Webhook] Transaction reference ${ref} already processed for invoice ${invoiceId}. Skipping.`);
        continue;
      }

      // 4. Mark Invoice as paid
      await InvoiceModel.updateInvoiceStatus(invoiceId, 'paid');

      // 5. Create transaction log
      const transactionId = await PaymentModel.createTransaction({
        invoice_id: invoiceId,
        student_id: invoice.student_id,
        parent_id: invoice.parent_id,
        provider: 'stripe',
        transaction_reference: ref,
        payment_status: 'success',
        amount: invoice.grand_total,
        currency: invoice.currency,
        payment_date: new Date(),
        gateway_response,
      });

      console.log(`[Webhook] Invoice ${invoiceId} marked as paid. Transaction created: ${transactionId}`);

      // 6. Send Emails
      try {
        const updatedInvoice = await InvoiceModel.findInvoiceById(invoiceId);
        await sendPaymentSuccessEmail({
          to: invoice.parent_email,
          parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
          studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
          invoiceNumber: invoice.invoice_number,
          amountPaid: invoice.grand_total,
          currency: invoice.currency,
          transactionRef: ref,
        });

        await sendReceiptEmail({
          to: invoice.parent_email,
          parentName: `${invoice.parent_first_name} ${invoice.parent_last_name}`,
          studentName: `${invoice.student_first_name} ${invoice.student_last_name}`,
          invoiceNumber: invoice.invoice_number,
          amountPaid: invoice.grand_total,
          currency: invoice.currency,
          paidAt: updatedInvoice.paid_at,
          items: invoice.items,
        });
      } catch (err) {
        console.error(`[Webhook] Notification emails failed for invoice ${invoiceId}:`, err.message);
      }
    }
  }

  /**
   * Get payment history for a parent
   */
  async getPaymentHistory(parentId) {
    return await PaymentModel.findPaymentHistoryByParentId(parentId);
  }
}

module.exports = new PaymentService();
