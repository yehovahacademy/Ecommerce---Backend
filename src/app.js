import express from "express";
import cors from "cors";

import userAuthRoutes from "../src/routes/userAuthRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";


const app = express()

app.use(cors({
    origin:[
    "http://localhost:5173",
    "http://localhost:5174",
    ],
    credentials:true,
}));

app.use(express.json())

app.use("/api/auth", userAuthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);

app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", productRoutes);
app.use("/api/products", productRoutes);

app.get('/', (req, res) => {
    res.status(200).json({
        success:true,
        message:"E-commerce backend is running"
    });
});

export default app;



