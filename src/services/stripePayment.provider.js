const PaymentProviderInterface = require('./paymentProvider.interface');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ApiError = require('../utils/apiError');

class StripePaymentProvider extends PaymentProviderInterface {
  constructor() {
    super('stripe');
  }

  /**
   * Process stripe payment
   */
  async processPayment({ invoice, amount, currency = 'USD', paymentMethod }) {
    try {
      // Determine the payment method ID or token to use:
      // If paymentMethod is passed and starts with pm_ or tok_, use it.
      // Otherwise, fallback to the default Stripe test card pm_card_visa.
      let stripePaymentMethod = 'pm_card_visa';
      if (paymentMethod && (paymentMethod.startsWith('pm_') || paymentMethod.startsWith('tok_'))) {
        stripePaymentMethod = paymentMethod;
      }

      // Stripe requires amount in cents/smallest currency unit
      const stripeAmount = Math.round(amount * 100);

      // Create and confirm the PaymentIntent immediately.
      const paymentIntent = await stripe.paymentIntents.create({
        amount: stripeAmount,
        currency: currency.toLowerCase(),
        payment_method: stripePaymentMethod,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        },
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          student_id: invoice.student_id,
          parent_id: invoice.parent_id,
        }
      });

      if (paymentIntent.status !== 'succeeded') {
        throw new ApiError(400, `Stripe payment intent status: ${paymentIntent.status}`);
      }

      return {
        provider: this.name,
        transactionReference: paymentIntent.id,
        status: 'success',
        amount,
        currency,
        meta: {
          paymentIntentId: paymentIntent.id,
          paymentMethodId: paymentIntent.payment_method,
          chargeId: paymentIntent.latest_charge,
          receiptUrl: paymentIntent.charges?.data?.[0]?.receipt_url || null,
        }
      };
    } catch (error) {
      console.error('Stripe Payment Processing Failed:', error);
      throw new ApiError(400, `Stripe Error: ${error.message}`);
    }
  }

  /**
   * Confirm Stripe payment
   */
  async confirmPayment({ transactionReference }) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(transactionReference);
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          transactionReference,
          status: 'success',
          gatewayResponse: paymentIntent
        };
      }
      return {
        success: false,
        transactionReference,
        status: paymentIntent.status,
        gatewayResponse: paymentIntent
      };
    } catch (error) {
      console.error('Stripe Payment Confirmation Failed:', error);
      throw new ApiError(400, `Stripe confirmation error: ${error.message}`);
    }
  }
}

module.exports = StripePaymentProvider;
