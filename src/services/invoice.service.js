const InvoiceModel = require('../modules/payment/payment.model');
const FeeCalculationService = require('./feeCalculation.service');
const { pool = null } = require('../config/db');
const ApiError = require('../utils/apiError');
const { sendInvoiceGeneratedEmail } = require('./email.service');

class InvoiceService {
  /**
   * Automatically generate an invoice when a student is approved by Admin
   * @param {number} studentId
   */
  static async generateInvoiceForStudent(studentId) {
    // Check if student already has a pending or paid invoice
    const existingPending = await InvoiceModel.findPendingInvoiceByStudentId(studentId);
    if (existingPending) {
      return await InvoiceModel.findInvoiceById(existingPending.id);
    }

    const existingPaid = await InvoiceModel.findPaidInvoiceByStudentId(studentId);
    if (existingPaid) {
      return await InvoiceModel.findInvoiceById(existingPaid.id);
    }

    // Get student details
    const [studentRows] = await pool.execute(
      `
      SELECT id, first_name, last_name, email, grade_level, academy, is_first_login
      FROM students
      WHERE id = ?
      LIMIT 1
      `,
      [studentId]
    );

    const student = studentRows[0];
    if (!student) {
      throw new ApiError(404, `Student with ID ${studentId} not found`);
    }

    // Get parent details
    const [parentRows] = await pool.execute(
      `
      SELECT u.id, u.first_name, u.last_name, u.email
      FROM parent_students ps
      INNER JOIN users u ON u.id = ps.parent_id
      WHERE ps.student_id = ?
      LIMIT 1
      `,
      [studentId]
    );

    const parent = parentRows[0];
    if (!parent) {
      throw new ApiError(400, `Parent record not found for student ID ${studentId}`);
    }

    // Determine student type (new vs returning)
    const studentType = student.is_first_login ? 'new' : 'returning';

    // Calculate fee breakdown with snapshot
    const feeCalculation = await FeeCalculationService.calculateFee({
      academy_name: student.academy || 'Global Academy',
      grade_level: student.grade_level,
      student_type: studentType,
    });

    // Generate unique invoice number: INV-YYYYMMDD-STUDENTID-RAND
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${student.id}-${randSuffix}`;

    // Due date: 14 days from generation
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);

    const invoiceId = await InvoiceModel.createInvoice({
      invoice_number: invoiceNumber,
      student_id: student.id,
      parent_id: parent.id,
      academy_id: student.academy || 'Global Academy',
      fee_plan_id: feeCalculation.fee_plan_id,
      subtotal: feeCalculation.subtotal,
      discount: feeCalculation.discount,
      tax: feeCalculation.tax,
      grand_total: feeCalculation.grand_total,
      currency: feeCalculation.currency,
      invoice_status: 'pending',
      due_date: dueDate,
      calculation_snapshot: feeCalculation.calculation_snapshot,
      items: feeCalculation.items,
    });

    const invoice = await InvoiceModel.findInvoiceById(invoiceId);

    // Send Invoice Generated email to parent asynchronously
    try {
      await sendInvoiceGeneratedEmail({
        to: parent.email,
        parentName: `${parent.first_name} ${parent.last_name}`,
        studentName: `${student.first_name} ${student.last_name}`,
        invoiceNumber: invoice.invoice_number,
        grandTotal: invoice.grand_total,
        currency: invoice.currency,
        dueDate: invoice.due_date,
      });
    } catch (err) {
      console.error('Invoice email generation error:', err.message);
    }

    return invoice;
  }

  /**
   * Get invoice details with authorization check
   */
  static async getInvoiceById(invoiceId, user) {
    const invoice = await InvoiceModel.findInvoiceById(invoiceId);

    if (!invoice) {
      throw new ApiError(404, 'Invoice not found');
    }

    if (user.role === 'parent' && invoice.parent_id !== user.id) {
      throw new ApiError(403, 'You do not have permission to view this invoice');
    }

    if (user.role === 'student' && invoice.student_id !== user.id) {
      throw new ApiError(403, 'You do not have permission to view this invoice');
    }

    return invoice;
  }

  /**
   * Get all invoices for a parent
   */
  static async getInvoicesForParent(parentId) {
    return await InvoiceModel.findInvoicesByParentId(parentId);
  }

  /**
   * Get all invoices (Admin)
   */
  static async getAllInvoices() {
    return await InvoiceModel.findAllInvoices();
  }
}

module.exports = InvoiceService;
