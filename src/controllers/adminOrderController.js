

import {prisma} from "../config/prisma.js";

// Must match the OrderStatus enum in prisma/schema.prisma
const allowedStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

// Must match the PaymentStatus enum in prisma/schema.prisma
const allowedPaymentStatuses = ["PENDING", "PAID", "FAILED", "REFUNDED"];

export const getAllOrders = async(req,res) => {

    try {

        const orders = await prisma.order.findMany({
            orderBy:{
               createdAt: "desc"
            },
            include:{
                user:{
                    select:{
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true
                    }
                },
                items: true
            }
        });



        return res.status(200).json({
            success:true,
            data: orders,
            message: "Orders loaded Successfully"
        });



    }catch(error){
        console.error("Order error:", error)

        return res.status(500).json({
            success:false,
            message: "Internal Server error"
        });
    }
};

// GET ORDER BY ID
export const getOrderById = async(req,res) => {
    try {

        const {orderId} = req.params;
        
        const orders = await prisma.order.findUnique({
            where:{
               id: orderId
            },
            include:{
                user:{
                    select:{
                        id: true,
                        name: true,
                        email:true
                    }
                },
                items: true
            }
        });

        if(!orders){
           return res.status(404).json({
            success: false,
            message: "Orders not found"
           });
        }

        return res.status(200).json({
            success: true,
            data: orders,
            message: "Orders loaded successfully"
        });



    }catch(error){
        console.error("Get Order Error:", error)

        return res.status(500).json({
            success:false,
            message: "Internal Server Error"
        });
    }
};


//GET UPDATE ORDER STATUS

export const updateOrderStatus = async(req, res) => {
    try {

        const {orderId} = req.params;

        const { status: rawStatus, paymentStatus: rawPaymentStatus } = req.body ?? {};

        if(rawStatus === undefined && rawPaymentStatus === undefined){
            return res.status(400).json({
                success:false,
                message: "Provide status, paymentStatus, or both"
            });
        }

        // Accept "Confirmed" or "confirmed" as well as "CONFIRMED"
        const status = typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : rawStatus;
        const paymentStatus = typeof rawPaymentStatus === "string" ? rawPaymentStatus.trim().toUpperCase() : rawPaymentStatus;

        if(status !== undefined && !allowedStatuses.includes(status)){

            return res.status(400).json({
                success:false,
                message: `Invalid order status. Allowed values: ${allowedStatuses.join(", ")}`
            });
        }

        if(paymentStatus !== undefined && !allowedPaymentStatuses.includes(paymentStatus)){

            return res.status(400).json({
                success:false,
                message: `Invalid payment status. Allowed values: ${allowedPaymentStatuses.join(", ")}`
            });
        }

        const existingOrder = await prisma.order.findUnique({
            where:{
                id: orderId
            }
        });

        if(!existingOrder){

            return res.status(404).json({
                success:false,
                message:"The Order ID does not exist"
            });
        }

        const data = {};
        if(status !== undefined) data.status = status;
        if(paymentStatus !== undefined) data.paymentStatus = paymentStatus;

        // Cash on delivery is collected on delivery: mark it paid automatically,
        // unless the admin set a payment status explicitly or it isn't pending
        if(
            status === "DELIVERED" &&
            paymentStatus === undefined &&
            existingOrder.paymentMethod === "COD" &&
            existingOrder.paymentStatus === "PENDING"
        ){
            data.paymentStatus = "PAID";
        }

        const updateOrder = await prisma.order.update({
             where: {
                id: orderId
             },
             data
        });

        return res.status(200).json({
            success:true,
            data: updateOrder,
            message:"The order has been updated successfully"
        })

    }catch(error){
        console.error("Order Update Error:", error)

        return res.status(500).json({
            success:false,
            message: "Internal Server Error"
        });
    }
};