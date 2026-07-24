const { pool } = require('../../config/db');

// ==========================================
// 1. PAYMENT TRANSACTIONS MODELS
// ==========================================

exports.createTransaction = async ({
  invoice_id,
  student_id,
  parent_id,
  provider = 'manual',
  transaction_reference,
  payment_status = 'pending',
  amount,
  currency = 'USD',
  payment_date,
  gateway_response = null,
}) => {
  const [result] = await pool.execute(
    `
    INSERT INTO payment_transactions (
      invoice_id, student_id, parent_id, provider, transaction_reference,
      payment_status, amount, currency, payment_date, gateway_response
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      invoice_id,
      student_id,
      parent_id,
      provider,
      transaction_reference || null,
      payment_status,
      amount,
      currency,
      payment_date || new Date(),
      gateway_response ? JSON.stringify(gateway_response) : null,
    ]
  );
  return result.insertId;
};

exports.updateTransactionStatus = async (transactionId, paymentStatus, gatewayResponse = null) => {
  const [result] = await pool.execute(
    `
    UPDATE payment_transactions
    SET payment_status = ?,
        gateway_response = COALESCE(?, gateway_response)
    WHERE id = ?
    `,
    [paymentStatus, gatewayResponse ? JSON.stringify(gatewayResponse) : null, transactionId]
  );
  return result.affectedRows;
};

exports.findTransactionById = async (transactionId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, invoice_id, student_id, parent_id, provider, transaction_reference,
           payment_status, amount, currency, payment_date, gateway_response, created_at
    FROM payment_transactions
    WHERE id = ?
    LIMIT 1
    `,
    [transactionId]
  );
  return rows[0] || null;
};

exports.findPaymentHistoryByParentId = async (parentId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      t.id AS transaction_id,
      t.invoice_id,
      t.student_id,
      t.provider,
      t.transaction_reference,
      t.payment_status,
      t.amount,
      t.currency,
      t.payment_date,
      inv.invoice_number,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name
    FROM payment_transactions t
    INNER JOIN student_invoice inv ON inv.id = t.invoice_id
    INNER JOIN students s ON s.id = t.student_id
    WHERE t.parent_id = ?
    ORDER BY t.created_at DESC
    `,
    [parentId]
  );
  return rows;
};

exports.hasPaidInvoice = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT 1
    FROM student_invoice
    WHERE student_id = ? AND invoice_status = 'paid'
    LIMIT 1
    `,
    [studentId]
  );
  return rows.length > 0;
};


// ==========================================
// 2. STUDENT INVOICE MODELS
// ==========================================

exports.createInvoice = async ({
  invoice_number,
  student_id,
  parent_id,
  academy_id,
  fee_plan_id,
  subtotal,
  discount = 0,
  tax = 0,
  grand_total,
  currency = 'USD',
  invoice_status = 'pending',
  due_date,
  calculation_snapshot = null,
  items = [],
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      INSERT INTO student_invoice (
        invoice_number, student_id, parent_id, academy_id, fee_plan_id,
        subtotal, discount, tax, grand_total, currency, invoice_status, calculation_snapshot, due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoice_number,
        student_id,
        parent_id,
        academy_id || null,
        fee_plan_id || null,
        subtotal,
        discount,
        tax,
        grand_total,
        currency,
        invoice_status,
        calculation_snapshot ? JSON.stringify(calculation_snapshot) : null,
        due_date || null,
      ]
    );

    const invoiceId = result.insertId;

    if (items && items.length > 0) {
      for (const item of items) {
        await connection.execute(
          `
          INSERT INTO student_invoice_items (
            invoice_id, item_name, amount, quantity, total
          ) VALUES (?, ?, ?, ?, ?)
          `,
          [
            invoiceId,
            item.item_name,
            item.amount,
            item.quantity || 1,
            item.total || item.amount * (item.quantity || 1),
          ]
        );
      }
    }

    await connection.commit();
    return invoiceId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.findInvoiceById = async (invoiceId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      inv.id,
      inv.invoice_number,
      inv.student_id,
      inv.parent_id,
      inv.academy_id,
      inv.fee_plan_id,
      inv.subtotal,
      inv.discount,
      inv.tax,
      inv.grand_total,
      inv.currency,
      inv.invoice_status,
      inv.calculation_snapshot,
      inv.generated_at,
      inv.due_date,
      inv.paid_at,
      inv.created_at,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      s.email AS student_email,
      s.grade_level AS student_grade_level,
      u.first_name AS parent_first_name,
      u.last_name AS parent_last_name,
      u.email AS parent_email,
      u.phone AS parent_phone
    FROM student_invoice inv
    LEFT JOIN students s ON s.id = inv.student_id
    LEFT JOIN users u ON u.id = inv.parent_id
    WHERE inv.id = ?
    LIMIT 1
    `,
    [invoiceId]
  );

  if (!rows[0]) return null;

  const invoice = rows[0];
  let snapshotObj = null;

  if (invoice.calculation_snapshot) {
    try {
      snapshotObj = typeof invoice.calculation_snapshot === 'string'
        ? JSON.parse(invoice.calculation_snapshot)
        : invoice.calculation_snapshot;
    } catch (e) {
      snapshotObj = invoice.calculation_snapshot;
    }
  }

  const [items] = await pool.execute(
    `
    SELECT id, invoice_id, item_name, amount, quantity, total
    FROM student_invoice_items
    WHERE invoice_id = ?
    ORDER BY id ASC
    `,
    [invoiceId]
  );

  return {
    ...invoice,
    calculation_snapshot: snapshotObj,
    items,
  };
};

exports.findPendingInvoiceByStudentId = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, invoice_number, student_id, parent_id, grand_total, currency, invoice_status, generated_at
    FROM student_invoice
    WHERE student_id = ? AND invoice_status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [studentId]
  );
  return rows[0] || null;
};

exports.findPaidInvoiceByStudentId = async (studentId) => {
  const [rows] = await pool.execute(
    `
    SELECT id, invoice_number, student_id, parent_id, grand_total, currency, invoice_status, paid_at
    FROM student_invoice
    WHERE student_id = ? AND invoice_status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 1
    `,
    [studentId]
  );
  return rows[0] || null;
};

exports.updateInvoiceStatus = async (invoiceId, status, paidAt = null) => {
  const [result] = await pool.execute(
    `
    UPDATE student_invoice
    SET invoice_status = ?,
        paid_at = CASE WHEN ? = 'paid' THEN COALESCE(?, NOW()) ELSE paid_at END
    WHERE id = ?
    `,
    [status, status, paidAt, invoiceId]
  );
  return result.affectedRows;
};

exports.findInvoicesByParentId = async (parentId) => {
  const [rows] = await pool.execute(
    `
    SELECT
      inv.id,
      inv.invoice_number,
      inv.student_id,
      inv.parent_id,
      inv.academy_id,
      inv.grand_total,
      inv.currency,
      inv.invoice_status,
      inv.generated_at,
      inv.due_date,
      inv.paid_at,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      s.grade_level AS student_grade_level
    FROM student_invoice inv
    LEFT JOIN students s ON s.id = inv.student_id
    WHERE inv.parent_id = ?
    ORDER BY inv.created_at DESC
    `,
    [parentId]
  );
  return rows;
};

exports.findAllInvoices = async () => {
  const [rows] = await pool.execute(
    `
    SELECT
      inv.id,
      inv.invoice_number,
      inv.student_id,
      inv.parent_id,
      inv.academy_id,
      inv.grand_total,
      inv.currency,
      inv.invoice_status,
      inv.generated_at,
      inv.due_date,
      inv.paid_at,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      u.first_name AS parent_first_name,
      u.last_name AS parent_last_name
    FROM student_invoice inv
    LEFT JOIN students s ON s.id = inv.student_id
    LEFT JOIN users u ON u.id = inv.parent_id
    ORDER BY inv.created_at DESC
    `
  );
  return rows;
};


// ==========================================
// 3. CONFIGURABLE FEE CONFIGS & PLANS MODELS
// ==========================================

// Legacy Plan support
exports.createFeePlan = async ({
  academy_id,
  grade_level,
  plan_name,
  currency = 'USD',
  total_amount,
  status = 'active',
  items = [],
}) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      INSERT INTO fee_plan_master (
        academy_id, grade_level, plan_name, currency, total_amount, status
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [academy_id, grade_level, plan_name, currency, total_amount, status]
    );

    const feePlanId = result.insertId;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await connection.execute(
          `
          INSERT INTO fee_plan_items (
            fee_plan_id, component_name, amount, display_order
          ) VALUES (?, ?, ?, ?)
          `,
          [feePlanId, item.component_name, item.amount, item.display_order || i + 1]
        );
      }
    }

    await connection.commit();
    return feePlanId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.findFeePlanById = async (feePlanId) => {
  const [masterRows] = await pool.execute(
    `
    SELECT id, academy_id, grade_level, plan_name, currency, total_amount, status, created_at, updated_at
    FROM fee_plan_master
    WHERE id = ?
    LIMIT 1
    `,
    [feePlanId]
  );

  if (!masterRows[0]) return null;

  const [itemsRows] = await pool.execute(
    `
    SELECT id, fee_plan_id, component_name, amount, display_order
    FROM fee_plan_items
    WHERE fee_plan_id = ?
    ORDER BY display_order ASC
    `,
    [feePlanId]
  );

  return {
    ...masterRows[0],
    items: itemsRows,
  };
};

exports.findFeePlanByAcademyAndGrade = async (academyId, gradeLevel) => {
  const [rows] = await pool.execute(
    `
    SELECT id, academy_id, grade_level, plan_name, currency, total_amount, status
    FROM fee_plan_master
    WHERE status = 'active'
      AND (academy_id = ? OR academy_id = 'ALL')
      AND (grade_level = ? OR grade_level = 'ALL')
    ORDER BY (academy_id = ?) DESC, (grade_level = ?) DESC, created_at DESC
    LIMIT 1
    `,
    [academyId, gradeLevel, academyId, gradeLevel]
  );
  if (!rows[0]) return null;
  return await exports.findFeePlanById(rows[0].id);
};

exports.findAllFeePlans = async () => {
  const [rows] = await pool.execute(
    `
    SELECT
      fp.id,
      fp.academy_id,
      fp.grade_level,
      fp.plan_name,
      fp.currency,
      fp.total_amount,
      fp.status,
      fp.created_at,
      COUNT(fpi.id) AS total_items
    FROM fee_plan_master fp
    LEFT JOIN fee_plan_items fpi ON fpi.fee_plan_id = fp.id
    GROUP BY fp.id
    ORDER BY fp.created_at DESC
    `
  );
  return rows;
};

exports.updateFeePlan = async (feePlanId, fields) => {
  const allowed = ['academy_id', 'grade_level', 'plan_name', 'currency', 'total_amount', 'status'];
  const sets = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return 0;
  params.push(feePlanId);

  const [result] = await pool.execute(
    `
    UPDATE fee_plan_master
    SET ${sets.join(', ')}
    WHERE id = ?
    `,
    params
  );
  return result.affectedRows;
};

// Academies Config
exports.findAllAcademies = async () => {
  const [rows] = await pool.execute(
    `SELECT id, name, description, status, created_at FROM academy_master ORDER BY name ASC`
  );
  return rows;
};

exports.findAcademyById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, name, description, status FROM academy_master WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

exports.findAcademyByName = async (name) => {
  const [rows] = await pool.execute(
    `SELECT id, name, description, status FROM academy_master WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [name]
  );
  return rows[0] || null;
};

exports.createAcademy = async ({ name, description, status = 'active' }) => {
  const [result] = await pool.execute(
    `INSERT INTO academy_master (name, description, status) VALUES (?, ?, ?)`,
    [name, description || null, status]
  );
  return result.insertId;
};

exports.updateAcademy = async (id, { name, description, status }) => {
  const [result] = await pool.execute(
    `UPDATE academy_master SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ?`,
    [name || null, description || null, status || null, id]
  );
  return result.affectedRows;
};

// Grade Levels Config
exports.findAllGradeLevels = async () => {
  const [rows] = await pool.execute(
    `
    SELECT g.id, g.academy_id, a.name AS academy_name, g.grade_name, g.display_order, g.status
    FROM grade_level_master g
    LEFT JOIN academy_master a ON a.id = g.academy_id
    ORDER BY g.display_order ASC
    `
  );
  return rows;
};

exports.findGradeLevelById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, academy_id, grade_name, display_order, status FROM grade_level_master WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

exports.findGradeLevelByName = async (gradeName) => {
  const [rows] = await pool.execute(
    `SELECT id, academy_id, grade_name, display_order, status FROM grade_level_master WHERE LOWER(grade_name) = LOWER(?) LIMIT 1`,
    [gradeName]
  );
  return rows[0] || null;
};

exports.createGradeLevel = async ({ academy_id, grade_name, display_order = 1, status = 'active' }) => {
  const [result] = await pool.execute(
    `INSERT INTO grade_level_master (academy_id, grade_name, display_order, status) VALUES (?, ?, ?, ?)`,
    [academy_id || null, grade_name, display_order, status]
  );
  return result.insertId;
};

exports.updateGradeLevel = async (id, { academy_id, grade_name, display_order, status }) => {
  const [result] = await pool.execute(
    `UPDATE grade_level_master SET academy_id = COALESCE(?, academy_id), grade_name = COALESCE(?, grade_name), display_order = COALESCE(?, display_order), status = COALESCE(?, status) WHERE id = ?`,
    [academy_id !== undefined ? academy_id : null, grade_name || null, display_order || null, status || null, id]
  );
  return result.affectedRows;
};

// Fee Components Config
exports.findAllFeeComponents = async () => {
  const [rows] = await pool.execute(
    `SELECT id, component_name, component_type, frequency, status, created_at FROM fee_component_master ORDER BY id ASC`
  );
  return rows;
};

exports.findFeeComponentById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, component_name, component_type, frequency, status FROM fee_component_master WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

exports.createFeeComponent = async ({ component_name, component_type, frequency = 'Monthly', status = 'active' }) => {
  const [result] = await pool.execute(
    `INSERT INTO fee_component_master (component_name, component_type, frequency, status) VALUES (?, ?, ?, ?)`,
    [component_name, component_type, frequency, status]
  );
  return result.insertId;
};

exports.updateFeeComponent = async (id, { component_name, component_type, frequency, status }) => {
  const [result] = await pool.execute(
    `UPDATE fee_component_master SET component_name = COALESCE(?, component_name), component_type = COALESCE(?, component_type), frequency = COALESCE(?, frequency), status = COALESCE(?, status) WHERE id = ?`,
    [component_name || null, component_type || null, frequency || null, status || null, id]
  );
  return result.affectedRows;
};

// Fee Plans Config (Refactored to omit grade_level_id)
exports.findMatchingFeePlan = async ({ academyId, studentType = 'new' }) => {
  const [rows] = await pool.execute(
    `
    SELECT
      fp.id,
      fp.academy_id,
      fp.student_type,
      fp.plan_name,
      fp.currency,
      fp.status
    FROM fee_plan_master fp
    WHERE fp.status = 'active'
      AND (fp.academy_id = ? OR fp.academy_id IS NULL)
      AND (fp.student_type = ? OR fp.student_type = 'all')
    ORDER BY
      (fp.academy_id = ?) DESC,
      (fp.student_type = ?) DESC,
      fp.created_at DESC
    LIMIT 1
    `,
    [academyId, studentType, academyId, studentType]
  );

  if (!rows[0]) return null;
  return await exports.findFeePlanConfigById(rows[0].id);
};

exports.findFeePlanConfigById = async (planId) => {
  const [masterRows] = await pool.execute(
    `
    SELECT
      fp.id,
      fp.academy_id,
      a.name AS academy_name,
      fp.student_type,
      fp.plan_name,
      fp.currency,
      fp.status,
      fp.created_at
    FROM fee_plan_master fp
    LEFT JOIN academy_master a ON a.id = fp.academy_id
    WHERE fp.id = ?
    LIMIT 1
    `,
    [planId]
  );

  if (!masterRows[0]) return null;

  const [itemsRows] = await pool.execute(
    `
    SELECT
      fpi.id,
      fpi.fee_plan_id,
      fpi.fee_component_id,
      fc.component_name,
      fc.component_type,
      fc.frequency,
      fpi.amount,
      fpi.is_required,
      fpi.display_order
    FROM fee_plan_items fpi
    INNER JOIN fee_component_master fc ON fc.id = fpi.fee_component_id
    WHERE fpi.fee_plan_id = ?
    ORDER BY fpi.display_order ASC
    `,
    [planId]
  );

  return {
    ...masterRows[0],
    items: itemsRows,
  };
};

exports.findAllFeePlanConfigs = async () => {
  const [rows] = await pool.execute(
    `
    SELECT
      fp.id,
      fp.academy_id,
      a.name AS academy_name,
      fp.student_type,
      fp.plan_name,
      fp.currency,
      fp.status,
      COUNT(fpi.id) AS total_items
    FROM fee_plan_master fp
    LEFT JOIN academy_master a ON a.id = fp.academy_id
    LEFT JOIN fee_plan_items fpi ON fpi.fee_plan_id = fp.id
    GROUP BY fp.id
    ORDER BY fp.created_at DESC
    `
  );
  return rows;
};

exports.createFeePlanConfig = async ({ academy_id, student_type = 'new', plan_name, currency = 'USD', status = 'active', items = [] }) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `INSERT INTO fee_plan_master (academy_id, student_type, plan_name, currency, status) VALUES (?, ?, ?, ?, ?)`,
      [academy_id, student_type, plan_name, currency, status]
    );

    const feePlanId = result.insertId;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await connection.execute(
          `INSERT INTO fee_plan_items (fee_plan_id, fee_component_id, amount, is_required, display_order) VALUES (?, ?, ?, ?, ?)`,
          [feePlanId, item.fee_component_id, item.amount, item.is_required !== false, item.display_order || i + 1]
        );
      }
    }

    await connection.commit();
    return feePlanId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.updateFeePlanConfig = async (id, { plan_name, status, currency }) => {
  const [result] = await pool.execute(
    `UPDATE fee_plan_master SET plan_name = COALESCE(?, plan_name), status = COALESCE(?, status), currency = COALESCE(?, currency) WHERE id = ?`,
    [plan_name || null, status || null, currency || null, id]
  );
  return result.affectedRows;
};

// Discounts Config
exports.findAllDiscounts = async () => {
  const [rows] = await pool.execute(
    `
    SELECT d.id, d.discount_name, d.discount_type, d.value, d.applicable_component, d.academy_id, d.grade_level_id, d.is_active, d.created_at
    FROM discount_master d
    ORDER BY d.id ASC
    `
  );
  return rows;
};

exports.findDiscountById = async (id) => {
  const [rows] = await pool.execute(
    `SELECT id, discount_name, discount_type, value, applicable_component, academy_id, grade_level_id, is_active FROM discount_master WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

exports.findActiveDiscounts = async ({ academyId, gradeLevelId }) => {
  const [rows] = await pool.execute(
    `
    SELECT id, discount_name, discount_type, value, applicable_component
    FROM discount_master
    WHERE is_active = TRUE
      AND (academy_id = ? OR academy_id IS NULL)
      AND (grade_level_id = ? OR grade_level_id IS NULL)
    `,
    [academyId || null, gradeLevelId || null]
  );
  return rows;
};

exports.createDiscount = async ({ discount_name, discount_type = 'percentage', value, applicable_component = 'Tuition', academy_id, grade_level_id, is_active = true }) => {
  const [result] = await pool.execute(
    `INSERT INTO discount_master (discount_name, discount_type, value, applicable_component, academy_id, grade_level_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [discount_name, discount_type, value, applicable_component, academy_id || null, grade_level_id || null, is_active ? 1 : 0]
  );
  return result.insertId;
};

exports.updateDiscount = async (id, fields) => {
  const allowed = ['discount_name', 'discount_type', 'value', 'applicable_component', 'academy_id', 'grade_level_id', 'is_active'];
  const sets = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return 0;
  params.push(id);

  const [result] = await pool.execute(`UPDATE discount_master SET ${sets.join(', ')} WHERE id = ?`, params);
  return result.affectedRows;
};
