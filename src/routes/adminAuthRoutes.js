import express from "express";
import { googleAdminLogin } from "../controllers/adminAuthController.js";

const router = express.Router()

router.post("/google", googleAdminLogin);

export default router;

