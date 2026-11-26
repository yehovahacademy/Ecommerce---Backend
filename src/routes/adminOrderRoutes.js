import express from "express";
import {
    getAllOrders,
    getOrderById,
    updateOrderStatus
} from "../controllers/adminOrderController.js";

import { authorizeRoles } from "../middleware/roleMiddleware.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("ADMIN"));

router.get("/orders", getAllOrders);
router.get("/orders/:orderId", getOrderById);
router.patch("/orders/:orderId/status", updateOrderStatus);

export default router;