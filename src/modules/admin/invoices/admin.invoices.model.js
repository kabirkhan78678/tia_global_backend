const { pool } = require("../../../config/db");

exports.createInvoice = async ({
  studentId,
  invoiceNumber,
  academicYear,
  invoiceType,
  tuitionFee,
  bookFee,
  totalAmount,
  paidAmount,
  dueAmount,
  status,
  dueDate,
}) => {
  const [result] = await pool.execute(
    `
      INSERT INTO tuition_invoices
      (
        student_id,
        invoice_number,
        academic_year,
        invoice_type,
        tuition_fee,
        book_fee,
        total_amount,
        paid_amount,
        due_amount,
        status,
        due_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      studentId,
      invoiceNumber,
      academicYear,
      invoiceType,
      tuitionFee,
      bookFee,
      totalAmount,
      paidAmount,
      dueAmount,
      status,
      dueDate,
    ]
  );

  return result.insertId;
};

exports.findAllInvoices = async () => {
  const [rows] = await pool.execute(
    `
      SELECT
        ti.*,
        s.first_name,
        s.last_name,
        s.email,
        s.grade_level
      FROM tuition_invoices ti
      INNER JOIN students s
        ON s.id = ti.student_id
      WHERE ti.deleted_at IS NULL
      ORDER BY ti.created_at DESC
    `
  );

  return rows;
};

exports.findInvoiceById = async (invoiceId) => {
  const [rows] = await pool.execute(
    `
      SELECT
        ti.*,
        s.first_name,
        s.last_name,
        s.email,
        s.grade_level
      FROM tuition_invoices ti
      INNER JOIN students s
        ON s.id = ti.student_id
      WHERE ti.id = ?
        AND ti.deleted_at IS NULL
      LIMIT 1
    `,
    [invoiceId]
  );

  return rows[0] || null;
};

exports.findInvoiceByStudentId = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM tuition_invoices
    WHERE student_id = ?
      AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [studentId]
  );

  return rows[0] || null;
};

exports.updateInvoice = async ({
  invoiceId,
  tuitionFee,
  bookFee,
  totalAmount,
  paidAmount,
  dueAmount,
  status,
  dueDate,
}) => {
  const [result] = await pool.execute(
    `
      UPDATE tuition_invoices
      SET
        tuition_fee = ?,
        book_fee = ?,
        total_amount = ?,
        paid_amount = ?,
        due_amount = ?,
        status = ?,
        due_date = ?
      WHERE id = ?
    `,
    [
      tuitionFee,
      bookFee,
      totalAmount,
      paidAmount,
      dueAmount,
      status,
      dueDate,
      invoiceId,
    ]
  );

  return result.affectedRows;
};

exports.deleteInvoice = async (invoiceId) => {
  const [result] = await pool.execute(
    `
      UPDATE tuition_invoices
      SET deleted_at = NOW()
      WHERE id = ?
    `,
    [invoiceId]
  );

  return result.affectedRows;
};