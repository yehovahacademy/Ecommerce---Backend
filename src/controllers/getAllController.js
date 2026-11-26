
import {prisma} from "../config/prisma.js";

export const getAllCustomers = async(req, res) => {

    try {

        const allUsers = await prisma.user.findMany({
            where:{
                role: "USER"
            },
            select:{
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
                createdAt: true
            }
        })


        return res.status(200).json({
            success:true,
            message:"Loaded all the users successfully",
            data: allUsers
        });

    } catch(error){
        console.error("Customer Error:", error)

        return res.status(500).json({
            success:false,
            message:"Internal Server Error",
        });
    }
};