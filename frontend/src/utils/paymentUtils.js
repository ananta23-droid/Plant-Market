/**
 * Shared payment display utilities used across all dashboards.
 * Rules:
 *  - CASH_ON_DELIVERY  → "Cash on Delivery" (pre-delivery) | "Received (Cash)" (post-delivery)
 *  - ESEWA             → "Pre-payment (eSewa)"
 *  - KHALTI            → "Pre-payment (Khalti)"
 *  - CARD              → "Pre-payment (Credit/Debit Card)"
 *  - No payment record → default to COD display rules (assume COD if nothing was selected)
 */

/** Maps a payment_method code to a human-readable label */
export const formatPaymentMethod = (method) => {
  switch (method) {
    case 'CASH_ON_DELIVERY': return 'Cash on Delivery';
    case 'ESEWA':            return 'Pre-payment (eSewa)';
    case 'KHALTI':           return 'Pre-payment (Khalti)';
    case 'CARD':             return 'Pre-payment (Credit/Debit Card)';
    default:                 return method?.replace(/_/g, ' ') || 'Cash on Delivery';
  }
};

/** Returns true if the payment method is an online (pre-paid) method */
export const isOnlinePayment = (method) =>
  ['ESEWA', 'KHALTI', 'CARD'].includes(method);

/**
 * Returns a display string for an order's payment, suitable for plain text use.
 * @param {object} order - The order object with optional `.payment` and `.status` fields
 */
export const getPaymentLabel = (order) => {
  const p = order?.payment;
  const isDelivered = order?.status === 'DELIVERED';

  if (!p) {
    // No payment record — assume COD
    return isDelivered ? 'Received (Cash)' : 'Cash on Delivery';
  }

  if (isOnlinePayment(p.payment_method)) {
    // Online payments always show their method — never fall back to COD
    return formatPaymentMethod(p.payment_method);
  }

  // CASH_ON_DELIVERY
  return isDelivered ? 'Received (Cash)' : 'Cash on Delivery';
};
