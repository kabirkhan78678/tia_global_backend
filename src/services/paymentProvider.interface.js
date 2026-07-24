/**
 * Base Abstract Class / Interface for Payment Gateway Providers
 */
class PaymentProviderInterface {
  constructor(name) {
    if (this.constructor === PaymentProviderInterface) {
      throw new Error("Abstract class PaymentProviderInterface cannot be instantiated directly.");
    }
    this.name = name;
  }

  /**
   * Initialize a payment session or intent
   * @param {Object} payload { invoice, student, parent, amount, currency }
   * @returns {Promise<Object>} { provider: string, transactionReference: string, status: string, meta: Object }
   */
  async processPayment(payload) {
    throw new Error("Method 'processPayment()' must be implemented.");
  }

  /**
   * Confirm or verify payment completion
   * @param {Object} payload { transactionReference, invoiceId, extraData }
   * @returns {Promise<Object>} { success: boolean, transactionReference: string, status: string, gatewayResponse: Object }
   */
  async confirmPayment(payload) {
    throw new Error("Method 'confirmPayment()' must be implemented.");
  }
}

module.exports = PaymentProviderInterface;
