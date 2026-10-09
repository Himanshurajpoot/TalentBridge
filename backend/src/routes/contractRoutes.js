const express = require("express");

const {
    getMyContracts,
    getContractById,
    completeContract,
} = require("../controllers/contractController");
const {
    createContractPaymentOrder,
    verifyContractPayment,
} = require("../controllers/paymentController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

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

router.patch(
    "/:contractId/complete",
    authenticate,
    authorize("client", "freelancer"),
    completeContract
);

router.post(
    "/:contractId/payment-orders",
    authenticate,
    authorize("client"),
    createContractPaymentOrder
);

module.exports = router;
