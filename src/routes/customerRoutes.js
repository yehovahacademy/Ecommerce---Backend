
import express from "express";
import { getAllCustomers } from "../controllers/getAllController.js";
import {protect} from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router =  express.Router()


router.get("/customers", protect, authorizeRoles("ADMIN"), getAllCustomers);

export default router