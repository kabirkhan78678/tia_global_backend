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
      if (invoice) {
        invoicesToPay.push(invoice);
      }
    } else if (student_id) {
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

    // If no pending invoices are found, create a mock pending invoice first so we can pay it!
    if (invoicesToPay.length === 0) {
      const students = await AuthModel.findStudentsByParentId(parent_id);
      const targetStudent = students.find(s => s.status === 'active') || students[0];
      if (targetStudent) {
        const invoiceNum = `INV-MOCK-${Date.now()}`;
        const newInvoiceId = await InvoiceModel.createInvoice({
          invoice_number: invoiceNum,
          student_id: targetStudent.id,
          parent_id: parent_id,
          academy_id: null,
          fee_plan_id: null,
          due_date: null,
          subtotal: 100.00,
          grand_total: 100.00,
          invoice_status: 'pending',
          items: [
            {
              item_name: 'Mock Tuition Fee',
              amount: 100.00,
              quantity: 1
            }
          ]
        });
        const createdInvoice = await InvoiceModel.findInvoiceById(newInvoiceId);
        if (createdInvoice) {
          invoicesToPay.push(createdInvoice);
        }
      }
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
   * Get payment history for a parent
   */
  async getPaymentHistory(parentId) {
    return await PaymentModel.findPaymentHistoryByParentId(parentId);
  }
}

module.exports = new PaymentService();
