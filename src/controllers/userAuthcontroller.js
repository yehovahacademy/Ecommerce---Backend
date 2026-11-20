import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { generateToken } from "../utils/generateToken.js";
import { success } from "zod";

export const registerUser = async (req, res) => {
    try {

        const {name, email, password} = req.body;

        if(!name||!email||!password){
            return res.status(400).json({
                success:false,
                message:"All fields are required"
            });
        }
        

        if(password.length < 8){
            return res.status(400).json({
                success:false,
                message:"Pasword must contain atleast 8 characters"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: {email},
        });

        if(existingUser){
            return res.status(400).json({
                success:false,
                message:"Email is already registered"
            });
        }

        const passwordHash = await bcrypt.hash(password,12);

        const user = await prisma.user.create({
            data:{
                name,
                email,
                passwordHash,
                role:"USER",
            },
            select: {
                id:true,
                name:true,
                email:true,
                role:true,
            },
        });

        const token = generateToken(user);

        return res.status(201).json({
            success:true,
            message:"Registration Successful",
            token,
            user
        });
    } catch(error){
    console.error("Registration error:", error);

    return res.status(500).json({
        success:false,
        message:"Registartion failed"
    });
    }
};

export const loginUser = async (req, res) => {
   try {

    const {email, password} = req.body;

    if(!email|| !password){
        return res.status(400).json({
            success:false,
            message:"The following fields are required"
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
        where:{email: normalizedEmail}
    })

    if(!user || !user.passwordHash){
        return res.status(400).json({
            success:false,
            message:"Invalid email or password"
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if(!isPasswordValid){
        return res.status(401).json({
            success:false,
            message:"Invalid Password"
        });
    }

    if(user.role === "USER"){
        return res.status(403).json({
            success: false,
            message: "Customer access denied"
        });
    }

    const token = generateToken(user);

    return res.status(200).json({
        success:true,
        message: "Login Successful",
        token,
        user:{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }

    })
   } catch(error){
    console.error("Login error:", error);

    return res.status(500).json({
        success: false,
        message: "Login failed"
    })

   }
};