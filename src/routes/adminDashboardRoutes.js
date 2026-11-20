import express from "express";
import {
    getDashboardstats
} from "../controllers/adminDashboardController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router()

router.get('/stats',
    protect,
    authorizeRoles("ADMIN"),
    getDashboardstats
 );

 export default router;