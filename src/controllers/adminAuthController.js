import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateToken } from "../utils/generateToken.js";

const sendAdminToken = (res, user) => {
    return res.status(200).json({
        success: true,
        message: "Admin login successful",
        token: generateToken(user),
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        },
    });
};

// Admins are never created by Supabase sign-in: the email must
// already belong to an ADMIN account (see `npm run create-admin`).
// On first sign-in the Supabase user ID is stored on the account, and later
// sign-ins must come from that same Supabase account.
const findAdminAndLink = async (res, { email, providerField, providerId, providerName }) => {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (!user || user.role !== "ADMIN") {
        res.status(403).json({
            success: false,
            message: "Admin access denied"
        });
        return null;
    }

    if (user[providerField] && user[providerField] !== providerId) {
        res.status(403).json({
            success: false,
            message: `${providerName} account does not match`
        });
        return null;
    }

    if (!user[providerField]) {
        return prisma.user.update({
            where: { id: user.id },
            data: { [providerField]: providerId },
        });
    }

    return user;
};

// POST /api/admin/auth/login  { email, password }
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

        return sendAdminToken(res, user);
    } catch (error) {
        console.error("Admin login error:", error);

        return res.status(500).json({
            success: false,
            message: "Admin login failed"
        });
    }
};

// POST /api/admin/auth/supabase  { accessToken }  (session.access_token from supabase-js)
// The token is checked by asking Supabase who it belongs to, so revoked or
// expired sessions are rejected and no JWT signing keys are needed here.
export const supabaseAdminLogin = async (req, res) => {
    try {
        const { accessToken } = req.body || {};
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error("Supabase admin login: SUPABASE_URL or SUPABASE_ANON_KEY is not set");
            return res.status(500).json({
                success: false,
                message: "Supabase authentication is not configured"
            });
        }

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: "Supabase access token is required"
            });
        }

        const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: SUPABASE_ANON_KEY,
            },
        });

        const supabaseUser = response.ok ? await response.json() : null;

        if (!supabaseUser?.id || !supabaseUser.email || !supabaseUser.email_confirmed_at) {
            return res.status(401).json({
                success: false,
                message: "Supabase account verification failed"
            });
        }

        const user = await findAdminAndLink(res, {
            email: supabaseUser.email,
            providerField: "supabaseId",
            providerId: supabaseUser.id,
            providerName: "Supabase",
        });

        if (!user) return;

        return sendAdminToken(res, user);
    } catch (error) {
        console.error("Supabase admin login error:", error);

        return res.status(500).json({
            success: false,
            message: "Supabase authentication failed"
        });
    }
};
