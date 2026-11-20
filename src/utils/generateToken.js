import jwt from "jsonwebtoken";


export const generateToken = (user) => {
    return jwt.sign(
        {
            role: user.role,
        },
        process.env.JWT_SECRET,
        {
            subject: user.id,
            expiresIn: "7d",
            algorithm: "HS256"
        }
    );
};