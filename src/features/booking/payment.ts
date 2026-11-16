// Payment step, kept behind one small interface so a real provider can slot in later.
//
// Adding Razorpay later (no secrets in the app):
//   1. Edge Function `create-payment-order` creates a Razorpay order server-side with
//      RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET stored as Supabase function secrets.
//   2. The app opens Razorpay checkout with the returned order_id (key_id only).
//   3. `create-booking` verifies razorpay_signature with the secret before inserting the booking.
//   4. Add `RazorpayProvider` below returning { provider: 'razorpay', reference, orderId, signature }.

export type PaymentQuote = { amount: number; currency: string; description: string };
export type PaymentResult = { provider: 'mock'; reference: string };

export interface PaymentProvider {
  readonly label: string;
  pay(quote: PaymentQuote): Promise<PaymentResult>;
}

/** Simulates a card payment: 1.5s of "processing", then success. */
export const MockPaymentProvider: PaymentProvider = {
  label: 'Test card •••• 4242',
  async pay() {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return { provider: 'mock', reference: `mock_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}` };
  },
};
