const FeePlanConfigModel = require('../modules/payment/payment.model');
const DiscountService = require('./discount.service');
const InvoiceBuilder = require('../utils/invoiceBuilder');
const ApiError = require('../utils/apiError');

class FeeCalculationService {
  /**
   * Calculate student fee breakdown dynamically based on Academy, Grade Level, Student Type, Fee Components, and Discounts.
   * @param {Object} params { academy_name, grade_level, student_type, is_full_tuition_payment, is_sibling }
   */
  static async calculateFee({
    academy_name = 'Global Academy',
    grade_level,
    student_type = 'new',
    is_full_tuition_payment = false,
    is_sibling = false,
  }) {
    if (!grade_level) {
      throw new ApiError(400, 'grade_level is required for fee calculation');
    }

    // 1. Determine Academy
    const academy = await FeePlanConfigModel.findAcademyByName(academy_name);
    const academyId = academy ? academy.id : 1;
    const resolvedAcademyName = academy ? academy.name : academy_name;

    // 2. Determine Grade Level
    const grade = await FeePlanConfigModel.findGradeLevelByName(grade_level);
    const gradeLevelId = grade ? grade.id : null;
    const resolvedGradeName = grade ? grade.grade_name : grade_level;

    // 3. Normalize Student Type
    const resolvedStudentType = (student_type || 'new').toLowerCase() === 'returning' ? 'returning' : 'new';

    // 4. Load Fee Plan
    let feePlan = await FeePlanConfigModel.findMatchingFeePlan({
      academyId,
      studentType: resolvedStudentType,
    });

    let feeComponents = [];
    let feePlanId = feePlan ? feePlan.id : null;
    let currency = feePlan ? feePlan.currency : 'USD';

    if (feePlan && feePlan.items && feePlan.items.length > 0) {
      feeComponents = feePlan.items.map((item) => ({
        fee_component_id: item.fee_component_id,
        component_name: item.component_name,
        component_type: item.component_type,
        frequency: item.frequency,
        amount: parseFloat(item.amount),
      }));
    } else {
      // Rule-based Fallback defaults if DB plan items not explicitly seeded for this grade
      const isReligious = resolvedAcademyName.toLowerCase().includes('religious');
      const tuitionAmt = isReligious ? 250.00 : 350.00;

      feeComponents.push({
        fee_component_id: 1,
        component_name: 'Tuition Fee',
        component_type: 'Tuition',
        frequency: 'Monthly',
        amount: tuitionAmt,
      });

      if (resolvedStudentType === 'new') {
        feeComponents.push({
          fee_component_id: 2,
          component_name: 'Enrollment Fee',
          component_type: 'Enrollment',
          frequency: 'One Time',
          amount: 150.00,
        });
      } else {
        feeComponents.push({
          fee_component_id: 3,
          component_name: 'Re-Enrollment Fee',
          component_type: 'ReEnrollment',
          frequency: 'Annual',
          amount: 75.00,
        });
      }

      // Technology fee applies ONLY to Global Academy
      if (!isReligious) {
        feeComponents.push({
          fee_component_id: 4,
          component_name: 'Technology Fee',
          component_type: 'Technology',
          frequency: 'Annual',
          amount: 200.00,
        });
      }
    }

    // 5. Extract Tuition component amount for discount rules
    const tuitionComp = feeComponents.find(
      (c) => c.component_type === 'Tuition' || c.component_name.toLowerCase().includes('tuition')
    );
    const tuitionAmount = tuitionComp ? parseFloat(tuitionComp.amount) : 0;

    // 6. Load & Calculate Discounts (Applies ONLY to Tuition)
    const discountsResult = await DiscountService.calculateDiscounts({
      academyId,
      gradeLevelId,
      tuitionAmount,
      isFullTuitionPayment,
      isSibling,
    });

    // 7. Build Invoice Payload & Audit Calculation Snapshot
    return InvoiceBuilder.buildInvoicePayload({
      academyName: resolvedAcademyName,
      gradeName: resolvedGradeName,
      studentType: resolvedStudentType,
      feePlanId,
      currency,
      feeComponents,
      discountsResult,
    });
  }
}

module.exports = FeeCalculationService;
