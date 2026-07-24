const FeePlanConfigModel = require('../modules/payment/payment.model');
const ApiError = require('../utils/apiError');

class FeePlanConfigService {
  // Academies
  static async getAcademies() {
    return await FeePlanConfigModel.findAllAcademies();
  }

  static async createAcademy(data) {
    if (!data.name || !data.name.trim()) throw new ApiError(400, 'Academy name is required');
    const existing = await FeePlanConfigModel.findAcademyByName(data.name.trim());
    if (existing) throw new ApiError(400, `Academy '${data.name}' already exists`);
    const id = await FeePlanConfigModel.createAcademy({
      name: data.name.trim(),
      description: data.description,
      status: data.status || 'active',
    });
    return await FeePlanConfigModel.findAcademyById(id);
  }

  static async updateAcademy(id, data) {
    const existing = await FeePlanConfigModel.findAcademyById(id);
    if (!existing) throw new ApiError(404, 'Academy not found');
    await FeePlanConfigModel.updateAcademy(id, data);
    return await FeePlanConfigModel.findAcademyById(id);
  }

  // Grade Levels
  static async getGradeLevels() {
    return await FeePlanConfigModel.findAllGradeLevels();
  }

  static async createGradeLevel(data) {
    if (!data.grade_name || !data.grade_name.trim()) throw new ApiError(400, 'grade_name is required');
    const id = await FeePlanConfigModel.createGradeLevel({
      academy_id: data.academy_id || null,
      grade_name: data.grade_name.trim(),
      display_order: data.display_order || 1,
      status: data.status || 'active',
    });
    return await FeePlanConfigModel.findGradeLevelById(id);
  }

  static async updateGradeLevel(id, data) {
    const existing = await FeePlanConfigModel.findGradeLevelById(id);
    if (!existing) throw new ApiError(404, 'Grade level not found');
    await FeePlanConfigModel.updateGradeLevel(id, data);
    return await FeePlanConfigModel.findGradeLevelById(id);
  }

  // Fee Components
  static async getFeeComponents() {
    return await FeePlanConfigModel.findAllFeeComponents();
  }

  static async createFeeComponent(data) {
    if (!data.component_name || !data.component_name.trim()) throw new ApiError(400, 'component_name is required');
    if (!data.component_type) throw new ApiError(400, 'component_type is required');
    const id = await FeePlanConfigModel.createFeeComponent({
      component_name: data.component_name.trim(),
      component_type: data.component_type,
      frequency: data.frequency || 'Monthly',
      status: data.status || 'active',
    });
    return await FeePlanConfigModel.findFeeComponentById(id);
  }

  static async updateFeeComponent(id, data) {
    const existing = await FeePlanConfigModel.findFeeComponentById(id);
    if (!existing) throw new ApiError(404, 'Fee component not found');
    await FeePlanConfigModel.updateFeeComponent(id, data);
    return await FeePlanConfigModel.findFeeComponentById(id);
  }

  // Fee Plans
  static async getFeePlans() {
    return await FeePlanConfigModel.findAllFeePlanConfigs();
  }

  static async getFeePlanById(id) {
    const plan = await FeePlanConfigModel.findFeePlanConfigById(id);
    if (!plan) throw new ApiError(404, 'Fee plan not found');
    return plan;
  }

  static async createFeePlan(data) {
    if (!data.academy_id) throw new ApiError(400, 'academy_id is required');
    if (!data.plan_name || !data.plan_name.trim()) throw new ApiError(400, 'plan_name is required');
    const id = await FeePlanConfigModel.createFeePlanConfig({
      academy_id: data.academy_id,
      student_type: data.student_type || 'all',
      plan_name: data.plan_name.trim(),
      currency: data.currency || 'USD',
      status: data.status || 'active',
      items: data.items || [],
    });
    return await FeePlanConfigModel.findFeePlanConfigById(id);
  }

  static async updateFeePlan(id, data) {
    const existing = await FeePlanConfigModel.findFeePlanConfigById(id);
    if (!existing) throw new ApiError(404, 'Fee plan not found');
    await FeePlanConfigModel.updateFeePlanConfig(id, data);
    return await FeePlanConfigModel.findFeePlanConfigById(id);
  }

  // Discounts
  static async getDiscounts() {
    return await FeePlanConfigModel.findAllDiscounts();
  }

  static async createDiscount(data) {
    if (!data.discount_name || !data.discount_name.trim()) throw new ApiError(400, 'discount_name is required');
    if (data.value === undefined || isNaN(parseFloat(data.value))) throw new ApiError(400, 'value must be a valid number');
    const id = await FeePlanConfigModel.createDiscount({
      discount_name: data.discount_name.trim(),
      discount_type: data.discount_type || 'percentage',
      value: parseFloat(data.value),
      applicable_component: data.applicable_component || 'Tuition',
      academy_id: data.academy_id || null,
      grade_level_id: data.grade_level_id || null,
      is_active: data.is_active !== false,
    });
    return await FeePlanConfigModel.findDiscountById(id);
  }

  static async updateDiscount(id, data) {
    const existing = await FeePlanConfigModel.findDiscountById(id);
    if (!existing) throw new ApiError(404, 'Discount rule not found');
    await FeePlanConfigModel.updateDiscount(id, data);
    return await FeePlanConfigModel.findDiscountById(id);
  }
}

module.exports = FeePlanConfigService;
