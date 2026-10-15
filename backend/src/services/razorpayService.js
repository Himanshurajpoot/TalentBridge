const crypto = require("node:crypto");
const Razorpay = require("razorpay");

const getRazorpayConfig = () => {
    const mode = (process.env.RAZORPAY_MODE || "test").trim().toLowerCase();
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

    if (!["test", "live"].includes(mode)) {
        throw new Error("Invalid Razorpay mode");
    }

    const expectedKeyPrefix = mode === "live" ? "rzp_live_" : "rzp_test_";

    if (!keyId?.startsWith(expectedKeyPrefix) || !keySecret) {
        throw new Error(
            `Razorpay ${mode}-mode credentials are not configured`,
        );
    }

    return {
        mode,
        keyId,
        keySecret,
        webhookSecret,
    };
};

const verifyRazorpayPaymentSignature = ({
    orderId,
    paymentId,
    signature,
}) => {
    const { keySecret } = getRazorpayConfig();

    if (
        typeof signature !== "string" ||
        !/^[a-f0-9]{64}$/i.test(signature)
    ) {
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

    const { webhookSecret, mode } = getRazorpayConfig();

    if (!webhookSecret) {
        throw new Error(
            `Razorpay ${mode}-mode webhook secret is not configured`,
        );
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
    const { keyId, keySecret } = getRazorpayConfig();

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
    getRazorpayConfig,
};