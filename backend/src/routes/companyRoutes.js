const express = require("express");

const {
    createCompany,
    getCompanies,
} = require("../controllers/companyController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();


// Get companies owned by the logged-in user
router.get(
    "/",
    authenticate,
    authorize("client", "admin"),
    getCompanies
);


// Create company
router.post(
    "/",
    authenticate,
    authorize("client", "admin"),
    createCompany
);


module.exports = router;