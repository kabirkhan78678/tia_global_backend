class InvoiceBuilder {
  static buildInvoicePayload({ academyName, gradeName, studentType, feePlanId, currency = 'USD', feeComponents = [], discountsResult = {} }) {
    let subtotal = 0;
    const invoiceItems = [];

    feeComponents.forEach((comp) => {
      const amt = parseFloat(comp.amount || 0);
      subtotal += amt;
      invoiceItems.push({
        item_name: comp.component_name,
        amount: amt,
        quantity: 1,
        total: amt,
      });
    });

    const discountAmount = discountsResult.total_discount || 0;
    const taxAmount = 0.00; // Future support
    const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

    const snapshot = {
      academy: academyName,
      grade: gradeName,
      student_type: studentType,
      components: feeComponents.map((c) => ({
        name: c.component_name,
        amount: parseFloat(c.amount),
        type: c.component_type,
      })),
      discounts: (discountsResult.applied_discounts || []).map((d) => ({
        name: d.name,
        amount: d.amount,
      })),
      subtotal,
      discount: discountAmount,
      grand_total: grandTotal,
      currency,
      calculated_at: new Date().toISOString(),
    };

    return {
      fee_plan_id: feePlanId,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      grand_total: grandTotal,
      currency,
      items: invoiceItems,
      calculation_snapshot: snapshot,
    };
  }
}

module.exports = InvoiceBuilder;
