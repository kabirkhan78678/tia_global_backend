const ApiError = require('./apiError'); // Since it is in src/utils/

exports.validateFeePlanInput = (data) => {
  const { academy_id, plan_name, total_amount, items } = data;

  if (!academy_id) {
    throw new ApiError(400, 'academy_id is required');
  }

  if (!plan_name || !plan_name.trim()) {
    throw new ApiError(400, 'plan_name is required');
  }

  const parsedAmount = parseFloat(total_amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    throw new ApiError(400, 'total_amount must be a valid non-negative number');
  }

  if (items && Array.isArray(items)) {
    items.forEach((item, index) => {
      if (!item.component_name || !item.component_name.trim()) {
        throw new ApiError(400, `Item at index ${index} requires component_name`);
      }
      const itemAmt = parseFloat(item.amount);
      if (isNaN(itemAmt) || itemAmt < 0) {
        throw new ApiError(400, `Item '${item.component_name}' amount must be a valid number`);
      }
    });
  }
};

exports.validatePayInput = (data) => {
  const { invoice_id } = data;

  if (!invoice_id) {
    throw new ApiError(400, 'invoice_id is required');
  }
};

exports.validateManualConfirmInput = (data) => {
  const { invoice_id } = data;

  if (!invoice_id) {
    throw new ApiError(400, 'invoice_id is required for manual confirmation');
  }
};
