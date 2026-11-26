import express from "express";
import {prisma} from "../config/prisma.js";
import {protect} from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { createOrder} from "../controllers/orderController.js";

const router = express.Router()

router.post("/", protect, createOrder)


export default router;
