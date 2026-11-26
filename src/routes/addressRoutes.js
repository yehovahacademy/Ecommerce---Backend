import express from "express";
import { createAddress, getAddresses, deleteAddress,updateAddress} from "../controllers/addressControllers.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router()

router.post("/", protect, createAddress);
router.get("/", protect, getAddresses);
router.delete("/:addressId", protect,  deleteAddress)
router.patch("/:addressId", protect, updateAddress)

export default router;