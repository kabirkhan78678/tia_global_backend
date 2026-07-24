const InvoiceModel = require('./payment.model');
const PaymentModel = require('./payment.model');
const ManualPaymentProvider = require('../../services/manualPayment.provider');
const ApiError = require('../../utils/apiError');
const { sendPaymentSuccessEmail, sendReceiptEmail } = require('../../services/email.service');

class PaymentService {
  constructor() {
    // Registry of available payment providers
    this.providers = new Map();
    this.registerProvider('manual', new ManualPaymentProvider());
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
  async processPayment({ invoice_id, parent_id, provider: providerName = 'manual', payment_method }) {
    const invoice = await InvoiceModel.findInvoiceById(invoice_id);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (invoice.parent_id !== parent_id) {
      throw new ApiError(403, 'You can only process payment for your own child\'s invoice');
    }

    if (invoice.invoice_status === 'paid') {
      throw new ApiError(400, 'This invoice has already been paid.');
    }

    const providerInstance = this.getProvider(providerName);

    const paymentResult = await providerInstance.processPayment({
      invoice,
      amount: invoice.grand_total,
      currency: invoice.currency,
      paymentMethod: payment_method,
    });

    const transactionId = await PaymentModel.createTransaction({
      invoice_id: invoice.id,
      student_id: invoice.student_id,
      parent_id: invoice.parent_id,
      provider: providerName,
      transaction_reference: paymentResult.transactionReference,
      payment_status: paymentResult.status || 'pending',
      amount: invoice.grand_total,
      currency: invoice.currency,
      payment_date: new Date(),
      gateway_response: paymentResult.meta || null,
    });

    return {
      transaction_id: transactionId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      amount: invoice.grand_total,
      currency: invoice.currency,
      provider: providerName,
      transaction_reference: paymentResult.transactionReference,
      payment_status: paymentResult.status,
      instructions: paymentResult.instructions,
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
   * Get payment history for a parent
   */
  async getPaymentHistory(parentId) {
    return await PaymentModel.findPaymentHistoryByParentId(parentId);
  }
}

module.exports = new PaymentService();
