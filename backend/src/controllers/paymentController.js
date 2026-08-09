import prisma from '../config/db.js';
import crypto from 'crypto';

// ── Khalti Config (env-var driven, no hardcoded secrets) ─────────────────────
const getKhaltiSecretKey = () => process.env.KHALTI_SECRET_KEY;
const getKhaltiGatewayUrl = () => process.env.KHALTI_GATEWAY_URL || 'https://a.khalti.com/api/v2';

// ── eSewa Config (env-var driven, sandbox by default) ────────────────────────
const getEsewaMerchantCode = () => process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
const getEsewaSecretKey    = () => process.env.ESEWA_SECRET_KEY    || '8gBm/:&EnhH.1/q';
const getEsewaPaymentUrl   = () => process.env.ESEWA_PAYMENT_URL   || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
const getEsewaStatusUrl    = () => process.env.ESEWA_STATUS_URL    || 'https://rc-epay.esewa.com.np/api/epay/transaction/status/';
const getEsewaEnv          = () => process.env.ESEWA_ENV           || 'sandbox';

/**
 * Generate HMAC-SHA256 signature for eSewa v2 API.
 * Spec: https://developer.esewa.com.np/#/epay?id=payment-request
 * Signature covers: total_amount,transaction_uuid,product_code
 */
const generateEsewaSignature = (totalAmount, transactionUuid, productCode = getEsewaMerchantCode()) => {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', getEsewaSecretKey()).update(message).digest('base64');
};

// ─────────────────────────────────────────────────────────────────────────────
//  KHALTI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payment/khalti/initiate
 * Initiates a Khalti payment by calling their API
 */
export const initiateKhaltiPayment = async (req, res, next) => {
  try {
    if (!getKhaltiSecretKey()) {
      return res.status(500).json({
        success: false,
        message: 'Khalti is not configured. Please set KHALTI_SECRET_KEY in the environment.',
      });
    }

    const { order_id } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Khalti expects amount in paisa (1 Rs = 100 paisa)
    const amountInPaisa = Math.round(Number(order.total_amount) * 100);
    const purchaseOrderId = order.id;
    const purchaseOrderName = `Order #${order.id.slice(0, 8).toUpperCase()}`;

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const payload = {
      return_url: `${clientUrl}/payment-callback`,
      website_url: clientUrl,
      amount: amountInPaisa,
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: {
        name: order.user.name,
        email: order.user.email,
        phone: order.user.phone || '9800000000',
      }
    };

    const response = await fetch(`${getKhaltiGatewayUrl()}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${getKhaltiSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({
        success: true,
        data: {
          payment_url: data.payment_url,
          pidx: data.pidx,
          environment: process.env.KHALTI_ENV || 'sandbox',
        }
      });
    } else {
      let userMessage = 'Failed to initiate Khalti payment. Please try another payment method.';
      if (data.detail === 'Invalid token.' || response.status === 401) {
        userMessage = 'Khalti payment gateway is not configured correctly. Please contact support or use another payment method.';
      } else if (data.detail) {
        userMessage = `Khalti error: ${data.detail}`;
      }

      res.status(400).json({ success: false, message: userMessage });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payment/khalti/verify
 * Verifies the payment with Khalti using pidx
 */
export const verifyKhaltiPayment = async (req, res, next) => {
  try {
    const { pidx, transaction_id, purchase_order_id } = req.body;

    if (!pidx) {
      return res.status(400).json({ success: false, message: 'Missing pidx.' });
    }

    if (!getKhaltiSecretKey()) {
      return res.status(500).json({ success: false, message: 'Khalti is not configured.' });
    }

    const response = await fetch(`${getKhaltiGatewayUrl()}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${getKhaltiSecretKey()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });

    const data = await response.json();

    if (response.ok && data.status === 'Completed') {
      const orderId = data.purchase_order_id || purchase_order_id;

      await prisma.$transaction(async (tx) => {
        const existingPayment = await tx.payment.findUnique({ where: { order_id: orderId } });

        if (existingPayment) {
          await tx.payment.update({
            where: { order_id: orderId },
            data: {
              payment_status: 'COMPLETED',
              transaction_id: data.transaction_id || transaction_id,
            }
          });
        } else {
          await tx.payment.create({
            data: {
              order_id: orderId,
              payment_method: 'KHALTI',
              payment_status: 'COMPLETED',
              transaction_id: data.transaction_id || transaction_id,
            }
          });
        }

        await tx.order.update({
          where: { id: orderId },
          data: { status: 'PROCESSING' }
        });
      });

      res.status(200).json({ success: true, message: 'Payment verified successfully.' });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment verification failed or payment is not completed.',
        error: data
      });
    }
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  eSEWA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/payment/esewa/initiate
 * Returns signed form parameters for eSewa v2 payment form POST.
 * The frontend submits these as a form to ESEWA_PAYMENT_URL.
 * eSewa sandbox docs: https://developer.esewa.com.np/#/epay
 */
export const initiateEsewaPayment = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: order_id },
      include: { user: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const totalAmount = Number(order.total_amount).toFixed(2);
    // eSewa uses a unique transaction_uuid per payment attempt
    const transactionUuid = `${order.id.slice(0, 8)}-${Date.now()}`;
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const signature = generateEsewaSignature(totalAmount, transactionUuid);

    // Return the fields needed for the eSewa form POST
    const formData = {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: getEsewaMerchantCode(),
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: `${clientUrl}/payment-callback?provider=esewa&order_id=${order.id}`,
      failure_url: `${clientUrl}/payment-callback?provider=esewa&status=failed&order_id=${order.id}`,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    res.status(200).json({
      success: true,
      data: {
        payment_url: getEsewaPaymentUrl(),
        form_data: formData,
        environment: getEsewaEnv(),
        order_id: order.id,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/payment/esewa/verify
 * Verifies eSewa payment status using the encoded response from eSewa callback.
 * eSewa v2 returns a base64-encoded JSON as `data` query param on success_url.
 */
export const verifyEsewaPayment = async (req, res, next) => {
  try {
    const { encoded_data, order_id } = req.body;

    if (!encoded_data) {
      return res.status(400).json({ success: false, message: 'Missing encoded_data from eSewa callback.' });
    }

    // Decode base64 JSON from eSewa
    let decoded;
    try {
      decoded = JSON.parse(Buffer.from(encoded_data, 'base64').toString('utf8'));
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid encoded_data from eSewa.' });
    }

    // Verify the response signature to prevent tampering
    const { transaction_uuid, total_amount, product_code, status, signature, signed_field_names } = decoded;

    if (status !== 'COMPLETE') {
      return res.status(400).json({ success: false, message: `eSewa payment status: ${status}` });
    }

    // Re-compute signature and compare
    const expectedSig = generateEsewaSignature(total_amount, transaction_uuid, product_code);
    if (expectedSig !== signature) {
      return res.status(400).json({ success: false, message: 'Signature verification failed. Payment rejected.' });
    }

    // Optionally cross-check status with eSewa status API
    const statusResponse = await fetch(
      `${getEsewaStatusUrl()}?product_code=${product_code}&total_amount=${total_amount}&transaction_uuid=${transaction_uuid}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    );
    const statusData = await statusResponse.json();

    if (!statusResponse.ok || statusData.status !== 'COMPLETE') {
      return res.status(400).json({
        success: false,
        message: 'eSewa status check failed.',
        error: statusData,
      });
    }

    // Payment confirmed — update database
    const targetOrderId = order_id || statusData.ref_id;

    if (!targetOrderId) {
      return res.status(400).json({ success: false, message: 'Cannot determine order ID for eSewa payment.' });
    }

    await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({ where: { order_id: targetOrderId } });

      if (existingPayment) {
        await tx.payment.update({
          where: { order_id: targetOrderId },
          data: {
            payment_status: 'COMPLETED',
            transaction_id: transaction_uuid,
          }
        });
      } else {
        await tx.payment.create({
          data: {
            order_id: targetOrderId,
            payment_method: 'ESEWA',
            payment_status: 'COMPLETED',
            transaction_id: transaction_uuid,
          }
        });
      }

      await tx.order.update({
        where: { id: targetOrderId },
        data: { status: 'PROCESSING' }
      });
    });

    res.status(200).json({ success: true, message: 'eSewa payment verified successfully.' });
  } catch (error) {
    next(error);
  }
};
