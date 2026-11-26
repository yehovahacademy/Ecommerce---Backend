import { prisma } from "../config/prisma.js";

// ADD PRODUCT TO CART
export const addProductToCart = async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId, quantity } = req.body;

        // 1. Validate Product ID
        if (!productId || typeof productId !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid Product ID"
            });
        }

        // 2. Find Product
        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product does not exist"
            });
        }

        // 3. Check Product Availability
        if (!product.isActive) {
            return res.status(400).json({
                success: false,
                message: "Product is currently unavailable"
            });
        }

        // 4. Validate Quantity
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive integer"
            });
        }

        // 5. Find or Create User Cart
        const cart = await prisma.cart.upsert({
            where: {
                userId: userId
            },
            update: {},
            create: {
                userId: userId
            }
        });

        // 6. Check Whether Product Already Exists in Cart
        const existingCartItem = await prisma.cartItem.findUnique({
            where: {
                cartId_productId: {
                    cartId: cart.id,
                    productId: productId
                }
            }
        });

        // 7. Calculate Final Quantity
        const newQuantity = existingCartItem
            ? existingCartItem.quantity + quantity
            : quantity;

        // 8. Validate Available Stock
        if (newQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Only ${product.stock} units are currently available`
            });
        }

        let cartItem;

        // 9. Update Existing Item or Create New Item
        if (existingCartItem) {
            cartItem = await prisma.cartItem.update({
                where: {
                    id: existingCartItem.id
                },
                data: {
                    quantity: newQuantity
                }
            });
        } else {
            cartItem = await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: productId,
                    quantity: quantity
                }
            });
        }

        // 10. Send Success Response
        return res.status(existingCartItem ? 200 : 201).json({
            success: true,
            message: "Product added to cart successfully",
            data: cartItem
        });

    } catch (error) {
        console.error("Cart Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

//GET cart
export const getCart = async(req, res) => {
      try {

        const userId = req.user.id;

        if(!userId){
            return res.status(401).json({
                success:false,
                message:"User authentication required"
            });
        }
         
           const cart = await prisma.cart.findUnique({
            where:{userId},
            include:{
                items:{
                  include:{
                    product:{
                      include:{
                        images:true
                      }
                    }
                  }
                }
            }
           });
        
        if(!cart){
            return res.status(200).json({
                success:true,
                message:"your cart is empty",
                data: {
                    items: []
                }
            });
        } 



            return res.status(200).json({
                success:true,
                data: cart,
                message: "Cart is fetched successfully"
            });
        


      } catch(error){
        console.error("Couldn't fetch the Cart", error)

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
      }
}


//UPDATE the CART QUANTITY

export const updateCartItem = async(req, res) => {
       
    try {

        const userId = req.user.id;

        const itemId = req.params.itemId;

        const {quantity} = req.body;

        if(!Number.isInteger(quantity) || quantity <= 0){

            return res.status(400).json({
                success:false,
                message: "Quantity error"
            });
        }

        const verify = await prisma.cartItem.findFirst({
            where:{
                id: itemId,
                cart: {
                    userId: userId
                }
            },
            include:{
                product: true
            }
        });

        if(!verify){

            return res.status(404).json({
                success:false,
                message:"Cart item not found"
            });
        }

        if(quantity > verify.product.stock){

            return res.status(400).json({
                success:false,
                message:`Only ${verify.product.stock} units are currently available`
            });
        }

        const updateCartItem = await prisma.cartItem.update({
              where:{
                 id: itemId
              },
              data:{
                quantity: quantity
              },
              include:{
                product: true
              }
        });


        return res.status(200).json({
            success: true,
            message:"Cart qunatity updated successfully",
            data: updateCartItem
        });



    } catch (error){
        console.error("Cart Update Error:", error)

        return res.status(500).json({
            success:false,
            message:"Internal Server error"
        });
    }
}

//DELETE A SINGLE PRODUCT

export const removeCartItem = async(req,res) => {

    try {

        const userId = req.user.id;
        const itemId = req.params.itemId;



        const verify = await prisma.cartItem.findFirst({
            where:{
                id: itemId,
                cart: {
                    userId: userId
                }
            }
        });

        if(!verify){
            return res.status(404).json({
                success:false,
                message: "Cart item not found"
            });
        }

        const deleteItem = await prisma.cartItem.delete({
            where:{
                id:itemId
            }
        })

        return res.status(200).json({
            success:true,
            data: deleteItem,
            message:"The product is removed successfully"
        })

    } catch(error){
        console.error("Remove Cart Item Error:", error)

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
};

//CLEAR CART

export const clearCart = async(req, res) => {

    try {

        const userId = req.user.id;

        const cart = await prisma.cart.findUnique({
            where:{
               userId: userId
            },
            include: {
                items: true
            }
        });


        if(!cart){

            return res.status(404).json({
                success:false,
                message:"Cart not found"
            });
        }

        const del = await prisma.cartItem.deleteMany({
            where:{
                cartId: cart.id
            }
        });


        return res.status(200).json({
            success:true,
            data: del,
            message:"Cart has been cleared successfully"
        });

    }catch(error){
        console.error("Clear Cart Error:", error)

        return res.status(500).json({
            success:false,
            message:"Internal Server Error"
        });
    }
}
