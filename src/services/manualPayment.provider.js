const PaymentProviderInterface = require('./paymentProvider.interface');
const crypto = require('crypto');

class ManualPaymentProvider extends PaymentProviderInterface {
  constructor() {
    super('manual');
  }

  /**
   * Process manual payment (generates manual transaction reference)
   */
  async processPayment({ invoice, amount, currency = 'USD', paymentMethod = 'Bank Transfer / Manual' }) {
    const transactionReference = `MANUAL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return {
      provider: this.name,
      transactionReference,
      status: 'pending',
      amount,
      currency,
      instructions: 'Manual payment initiated. Awaiting admin confirmation or receipt verification.',
      meta: {
        paymentMethod,
        initiatedAt: new Date(),
      },
    };
  }

  /**
   * Confirm manual payment
   */
  async confirmPayment({ transactionReference, paymentNotes = 'Manual payment confirmed by admin/system' }) {
    return {
      success: true,
      transactionReference,
      status: 'success',
      gatewayResponse: {
        confirmedBy: 'manual_provider',
        notes: paymentNotes,
        confirmedAt: new Date(),
      },
    };
  }
}

module.exports = ManualPaymentProvider;
