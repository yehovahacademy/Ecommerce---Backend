import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { addProductToCart, getCart, updateCartItem, removeCartItem, clearCart } from "../controllers/cartController.js";

const router = express.Router();

router.use(protect);

router.post("/", addProductToCart);
router.get("/", getCart);
router.patch("/:itemId", updateCartItem)
router.delete("/:itemId", removeCartItem);
router.delete("/", clearCart);

export default router;