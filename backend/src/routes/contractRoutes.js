const express = require("express");

const {
    getMyContracts,
    getContractById,
    submitContractWork,
    approveContractWork,
} = require("../controllers/contractController");
const {
    createContractPaymentOrder,
    verifyContractPayment,
    handleRazorpayWebhook,
} = require("../controllers/paymentController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.post(
    "/payment-webhooks/razorpay",
    handleRazorpayWebhook
);

router.post(
    "/payment-verifications/razorpay",
    authenticate,
    authorize("client"),
    verifyContractPayment
);

router.get(
    "/me",
    authenticate,
    authorize("client", "freelancer", "admin"),
    getMyContracts
);

router.get(
    "/:contractId",
    authenticate,
    authorize("client", "freelancer", "admin"),
    getContractById
);

router.post(
    "/:contractId/submit-work",
    authenticate,
    authorize("freelancer"),
    submitContractWork
);

router.patch(
    "/:contractId/approve",
    authenticate,
    authorize("client"),
    approveContractWork
);

router.patch(
    "/:contractId/complete",
    authenticate,
    authorize("client"),
    approveContractWork
);

router.post(
    "/:contractId/payment-orders",
    authenticate,
    authorize("client"),
    createContractPaymentOrder
);

module.exports = router;
