// Create an admin account, or give an existing account the ADMIN role and a new password.
// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='secret123' ADMIN_NAME='Admin' npm run create-admin
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/config/prisma.js";

const createAdmin = async () => {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    const name = process.env.ADMIN_NAME?.trim() || "Admin";

    if (!email || !password) {
        throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD");
    }

    if (password.length < 8) {
        throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.upsert({
        where: { email },
        update: { passwordHash, role: "ADMIN" },
        create: { email, name, passwordHash, role: "ADMIN" },
    });

    console.log(`Admin ready: ${user.email} (id ${user.id})`);
};

createAdmin()
    .catch((error) => {
        console.error("Create admin failed:", error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
