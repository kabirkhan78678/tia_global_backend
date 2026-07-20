const { pool } = require("../../../config/db");

exports.createPayment = async ({
  invoiceId,
  studentId,
  amount,
  paymentMethod,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO payments
    (
      invoice_id,
      student_id,
      amount,
      payment_method,
      payment_status,
      remarks
    )
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      invoiceId,
      studentId,
      amount,
      paymentMethod,
      "SUCCESS",
      "Payment completed",
    ]
  );

  return result.insertId;
};

exports.findPaymentById = async (id) => {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM payments
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

exports.getPaymentHistory = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM payments
    WHERE student_id = ?
    ORDER BY created_at DESC
    `,
    [studentId]
  );

  return rows;
};

exports.updateInvoice = async (invoiceId, totalAmount) => {
  await pool.execute(
    `
    UPDATE tuition_invoices
    SET
      paid_amount = ?,
      due_amount = 0,
      status = 'PAID',
      paid_at = NOW()
    WHERE id = ?
    `,
    [totalAmount, invoiceId]
  );
};