import {prisma} from "../config/prisma.js";

export const getDashboardstats = async(req,res) =>{
    try {
        const [
          totalProducts,
          totalCategories,
          totalCustomers,
          totalOrders,
          revenue
        ]= await Promise.all([
            prisma.product.count(),

            prisma.category.count(),

            prisma.user.count({
                where:{
                    role: "USER"
                }
            }),
            
             prisma.order.count(),

             prisma.order.aggregate({
                where:{
                    paymentStatus: "PAID"
                },
                _sum: {
                    totalAmount:true
                }
             })
        ]);
        

        return res.status(200).json({
            success:true,
            stats:{
                totalProducts,
                totalCategories,
                totalCustomers,
                totalOrders,
                totalRevenue: revenue._sum.totalAmount ?? 0
        }
    });



    } catch(error){
        console.error("Dashboard stats error:",error);

        return res.status(500).json({
            success:false,
            message: "Failed to fetch dashboard statistics"
        });

    }

};