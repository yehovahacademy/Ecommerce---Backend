
import express from "express";

import {
    previewDummyJSON,
    previewFakeStore,
    previewOpenAPI,
    importProducts,
} from "../controllers/productImportController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All import routes require admin authentication.
router.use(protect, authorizeRoles("ADMIN"));

router.get("/dummyjson", previewDummyJSON);
router.get("/fakestore", previewFakeStore);
router.get("/openapi", previewOpenAPI);

router.post("/", importProducts);

export default router;
