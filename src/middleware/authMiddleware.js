import jwt from "jsonwebtoken";

export const protect = async (req, res, next) => {
    try {

        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith("Bearer")){
           return res.status(401).json({
            success: false,
            message: "Auhtentication required"
           });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: decoded.sub,
            role: decoded.role
        };

        next();

    } catch(error){
      console.error("JWT ERROR:",error.message);

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};