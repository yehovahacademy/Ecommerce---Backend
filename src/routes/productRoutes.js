
import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductsById,
  updateProduct,
  deleteProduct,
  getAdminProducts,
  getExternalProducts
} from "../controllers/productController.js";

import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("ADMIN"), createProduct);

// External products — Fake Store API
router.get("/external", getExternalProducts);

// Existing database products
router.get("/", getAllProducts);
router.get("/admin-list", protect, authorizeRoles("ADMIN"), getAdminProducts);

router.get("/:id", getProductsById);

router.patch("/:id", protect, authorizeRoles("ADMIN"), updateProduct);

router.delete("/:id", protect, authorizeRoles("ADMIN"), deleteProduct);

export default router;
