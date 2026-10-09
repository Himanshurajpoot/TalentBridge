const pool = require("../config/db");

const contractDetailsQuery = `
    SELECT
        c.id,
        c.proposal_id,
        c.project_id,
        c.client_id,
        c.freelancer_id,
        c.agreed_amount,
        c.start_date,
        c.end_date,
        c.terms,
        c.status,
        c.created_at,
        c.updated_at,
        JSON_BUILD_OBJECT(
            'id', p.id::text,
            'title', p.title,
            'description', p.description,
            'status', p.status
        ) AS project,
        JSON_BUILD_OBJECT(
            'id', client.id,
            'name', client.full_name
        ) AS client,
        JSON_BUILD_OBJECT(
            'id', freelancer.id,
            'name', freelancer.full_name
        ) AS freelancer
    FROM contracts c
    JOIN projects p
        ON p.id = c.project_id
    JOIN users client
        ON client.id = c.client_id
    JOIN users freelancer
        ON freelancer.id = c.freelancer_id
`;

const getMyContracts = async (req, res) => {
    try {
        const result = await pool.query(
            `${contractDetailsQuery}
             WHERE c.client_id = $1
                OR c.freelancer_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id],
        );

        return res.status(200).json({
            success: true,
            data: {
                contracts: result.rows,
            },
        });
    } catch (error) {
        console.error("Get user contracts error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

const getContractById = async (req, res) => {
    try {
        const { contractId } = req.params;

        if (
            !/^[1-9]\d*$/.test(contractId) ||
            BigInt(contractId) > 9223372036854775807n
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid contract ID",
            });
        }

        const result = await pool.query(
            `${contractDetailsQuery}
             WHERE c.id = $1`,
            [contractId],
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Contract not found",
            });
        }

        const contract = result.rows[0];

        if (
            req.user.role !== "admin" &&
            Number(contract.client_id) !== Number(req.user.id) &&
            Number(contract.freelancer_id) !== Number(req.user.id)
        ) {
            return res.status(403).json({
                success: false,
                message: "You do not have permission to access this contract",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                contract,
            },
        });
    } catch (error) {
        console.error("Get contract error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = {
    getMyContracts,
    getContractById,
};
