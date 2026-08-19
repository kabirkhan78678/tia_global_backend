const PaymentProviderInterface = require('./paymentProvider.interface');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ApiError = require('../utils/apiError');

class StripePaymentProvider extends PaymentProviderInterface {
  constructor() {
    super('stripe');
  }

  /**
   * Process Stripe Checkout Session creation
   */
  async processPayment({ invoices, amount, currency = 'USD', parentId, studentId, frontendUrl }) {
    try {
      // Stripe requires amount in cents/smallest currency unit
      const stripeAmount = Math.round(amount * 100);

      let invoiceName;
      let invoiceIds;
      
      if (Array.isArray(invoices)) {
        invoiceIds = invoices.map(inv => inv.id).join(',');
        invoiceName = invoices.length === 1
          ? `Invoice #${invoices[0].invoice_number}`
          : `Tuition Fee (Invoices: ${invoices.map(inv => inv.invoice_number).join(', ')})`;
      } else {
        invoiceIds = invoices.id.toString();
        invoiceName = `Invoice #${invoices.invoice_number}`;
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: invoiceName,
              },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/payment/cancel`,
        metadata: {
          invoice_id: invoiceIds,
          parent_id: parentId.toString(),
          student_id: studentId ? studentId.toString() : '',
        },
      });

      return {
        provider: this.name,
        sessionId: session.id,
        checkoutUrl: session.url,
        status: 'pending',
      };
    } catch (error) {
      console.error('Stripe Checkout Session Creation Failed:', error);
      throw new ApiError(400, `Stripe Error: ${error.message}`);
    }
  }

  /**
   * Confirm Stripe payment (Retrieves Checkout Session)
   */
  async confirmPayment({ transactionReference }) {
    try {
      const session = await stripe.checkout.sessions.retrieve(transactionReference);
      if (session.payment_status === 'paid') {
        return {
          success: true,
          transactionReference,
          status: 'success',
          gatewayResponse: session
        };
      }
      return {
        success: false,
        transactionReference,
        status: session.payment_status,
        gatewayResponse: session
      };
    } catch (error) {
      console.error('Stripe Checkout Confirmation Failed:', error);
      throw new ApiError(400, `Stripe confirmation error: ${error.message}`);
    }
  }
}

module.exports = StripePaymentProvider;
