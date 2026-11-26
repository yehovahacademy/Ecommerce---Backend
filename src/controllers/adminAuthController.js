import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateToken } from "../utils/generateToken.js";

export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
        });

        if (!user || !user.passwordHash) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        if (user.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Admin access denied"
            });
        }

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: "Admin login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            },
        });
    } catch (error) {
        console.error("Admin login error:", error);

        return res.status(500).json({
            success: false,
            message: "Admin login failed"
        });
    }
};
