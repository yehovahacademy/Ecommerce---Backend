
import express from "express";
import cors from "cors";

// Authentication routes
import userAuthRoutes from "./routes/userAuthRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";

// Customer routes
import cartRoutes from "./routes/cartRoutes.js";
//import orderRoutes from "./routes/user/orderRoutes.js";

// Admin routes
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";

import productImportRoutes from "./routes/productImportRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";


const app = express();

app.use(cors({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://deal-duniya-user-frontend.vercel.app",
        "https://deal-duniya-admin-frontend.vercel.app",
    ],
    credentials: true,
}));

app.use(express.json());

// Express 5 leaves req.body undefined when no JSON body is sent, which makes
// `const { x } = req.body` throw in the controllers. Default it to {}.
app.use((req, res, next) => {
    req.body ??= {};
    next();
});

// Authentication
app.use("/api/auth", userAuthRoutes);
app.use("/api/admin/auth", adminAuthRoutes);

// Customer endpoints
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressRoutes);

// Admin endpoints
app.use("/api/admin/dashboard", adminDashboardRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/products", productRoutes);

app.use("/api/admin/import", productImportRoutes);
app.use("/api/admin", customerRoutes);
app.use("/api/admin", adminOrderRoutes);


// Health check
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "E-commerce backend is running"
    });
});

export default app;
