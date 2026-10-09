const express = require("express");

const {
    getMyContracts,
    getContractById,
} = require("../controllers/contractController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

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

module.exports = router;
