const express = require("express");

const {
    createProposal,
    getProjectProposals,
    updateProposalStatus,
    getMyProposals,
} = require("../controllers/proposalController");

const authenticate = require("../middleware/authMiddleware");
const authorize = require("../middleware/authorize");

const router = express.Router();

router.post(
    "/projects/:projectId/proposals",
    authenticate,
    authorize("freelancer"),
    createProposal
);

router.get(
    "/proposals/me",
    authenticate,
    authorize("freelancer"),
    getMyProposals
);

router.get(
    "/projects/:projectId/proposals",
    authenticate,
    authorize("client", "admin"),
    getProjectProposals
);

router.patch(
    "/projects/:projectId/proposals/:proposalId/status",
    authenticate,
    authorize("client", "admin"),
    updateProposalStatus
);

module.exports = router;