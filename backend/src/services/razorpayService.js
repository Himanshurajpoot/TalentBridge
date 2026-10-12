const crypto = require("node:crypto");
const Razorpay = require("razorpay");

const verifyRazorpayPaymentSignature = ({
    orderId,
    paymentId,
    signature,
}) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId?.startsWith("rzp_test_") || !keySecret?.trim()) {
        throw new Error("Razorpay test credentials are not configured");
    }

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest();
    const receivedSignature = Buffer.from(signature, "hex");

    return (
        expectedSignature.length === receivedSignature.length &&
        crypto.timingSafeEqual(expectedSignature, receivedSignature)
    );
};

const verifyRazorpayWebhookSignature = (rawBody, signature) => {
    if (
        (!Buffer.isBuffer(rawBody) && typeof rawBody !== "string") ||
        typeof signature !== "string" ||
        !/^[a-f0-9]{64}$/i.test(signature)
    ) {
        return false;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!keyId?.startsWith("rzp_test_") || !webhookSecret?.trim()) {
        throw new Error("Razorpay test credentials are not configured");
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest();
    const receivedSignature = Buffer.from(signature, "hex");

    return (
        expectedSignature.length === receivedSignature.length &&
        crypto.timingSafeEqual(expectedSignature, receivedSignature)
    );
};

const createRazorpayOrder = async (order) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId?.startsWith("rzp_test_") || !keySecret?.trim()) {
        throw new Error("Razorpay test credentials are not configured");
    }

    const razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    return razorpay.orders.create(order);
};

module.exports = {
    createRazorpayOrder,
    verifyRazorpayPaymentSignature,
    verifyRazorpayWebhookSignature,
};
