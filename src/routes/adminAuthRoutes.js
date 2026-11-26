import express from "express";
import {
    adminLogin,
    supabaseAdminLogin,
} from "../controllers/adminAuthController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/supabase", supabaseAdminLogin);

export default router;
