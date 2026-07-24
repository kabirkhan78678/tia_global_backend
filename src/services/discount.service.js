const FeePlanConfigModel = require('../modules/payment/payment.model');

class DiscountService {
  /**
   * Calculate applicable discounts for an invoice calculation
   * @param {Object} params { academyId, gradeLevelId, tuitionAmount, isFullTuitionPayment, isSibling }
   */
  static async calculateDiscounts({ academyId, gradeLevelId, tuitionAmount, isFullTuitionPayment = false, isSibling = false }) {
    if (!tuitionAmount || tuitionAmount <= 0) {
      return { total_discount: 0, applied_discounts: [] };
    }

    const activeDiscounts = await FeePlanConfigModel.findActiveDiscounts({ academyId, gradeLevelId });
    const appliedDiscounts = [];
    let totalDiscount = 0;

    for (const discount of activeDiscounts) {
      // Ensure discount ONLY applies to Tuition component
      if (discount.applicable_component && discount.applicable_component.toLowerCase() !== 'tuition') {
        continue;
      }

      let applyThis = false;
      const discNameLower = (discount.discount_name || '').toLowerCase();

      // Rule 1: Full Tuition Payment Discount
      if (discNameLower.includes('full') || isFullTuitionPayment) {
        if (isFullTuitionPayment || discNameLower.includes('full tuition')) {
          applyThis = true;
        }
      }

      // Rule 2: Sibling Discount
      if (discNameLower.includes('sibling') && isSibling) {
        applyThis = true;
      }

      if (applyThis) {
        let discountAmt = 0;
        if (discount.discount_type === 'percentage') {
          discountAmt = (tuitionAmount * parseFloat(discount.value)) / 100;
        } else if (discount.discount_type === 'fixed') {
          discountAmt = Math.min(tuitionAmount, parseFloat(discount.value));
        }

        discountAmt = Math.round(discountAmt * 100) / 100;

        if (discountAmt > 0) {
          totalDiscount += discountAmt;
          appliedDiscounts.push({
            discount_id: discount.id,
            name: discount.discount_name,
            type: discount.discount_type,
            value: parseFloat(discount.value),
            amount: discountAmt,
          });
        }
      }
    }

    return {
      total_discount: Math.round(totalDiscount * 100) / 100,
      applied_discounts: appliedDiscounts,
    };
  }
}

module.exports = DiscountService;
