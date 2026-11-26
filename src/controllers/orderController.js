
import { prisma } from "../config/prisma.js";
import { Prisma } from "../generated/prisma/client.ts";

const allowedPaymentMethods = ["COD", "ONLINE"];

export const createOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { addressId, paymentMethod } = req.body;

        // 1. Validate request
        if (!addressId) {
            return res.status(400).json({
                success: false,
                message: "Address ID is required"
            });
        }

        if (!allowedPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        // 2. Verify shipping address belongs to authenticated user
        const address = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId
            }
        });

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Shipping address not found"
            });
        }

        // 3. Retrieve cart with associated products
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty"
            });
        }

        // 4. Validate products and calculate subtotal
        let subtotal = new Prisma.Decimal(0);

        for (const item of cart.items) {
            const product = item.product;

            if (!product.isActive) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently unavailable`
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.name}`
                });
            }

            subtotal = subtotal.plus(
                product.price.mul(item.quantity)
            );
        }

        // 5. Calculate shipping and total
        const shippingFee = new Prisma.Decimal(0);
        const totalAmount = subtotal.plus(shippingFee);

        // 6. Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(
            Math.random() * 100000
        )}`;

        // 7. Create order, order items, deduct stock and clear cart
        const order = await prisma.$transaction(async (tx) => {

            // Recheck and deduct stock
            for (const item of cart.items) {
                const updated = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        isActive: true,
                        stock: {
                            gte: item.quantity
                        }
                    },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });

                if (updated.count !== 1) {
                    throw new Error(
                        `INSUFFICIENT_STOCK:${item.product.name}`
                    );
                }
            }

            // Create order and associated order items
            const newOrder = await tx.order.create({
                data: {
                    orderNumber,
                    subtotal,
                    shippingFee,
                    totalAmount,

                    shippingName: address.fullName,
                    shippingPhone: address.phone,
                    shippingAddressLine1: address.addressLine1,
                    shippingAddressLine2: address.addressLine2,
                    shippingCity: address.city,
                    shippingState: address.state,
                    shippingPostalCode: address.postalCode,
                    shippingCountry: address.country,

                    paymentMethod,
                    userId,

                    items: {
                        create: cart.items.map((item) => {
                            const unitPrice = item.product.price;
                            const lineTotal = unitPrice.mul(item.quantity);

                            return {
                                productName: item.product.name,
                                productSku: item.product.sku,
                                unitPrice,
                                quantity: item.quantity,
                                lineTotal,
                                productId: item.productId
                            };
                        })
                    }
                },
                include: {
                    items: true
                }
            });

            // Clear cart after successful order creation
            await tx.cartItem.deleteMany({
                where: {
                    cartId: cart.id
                }
            });

            return newOrder;
        });

        // 8. Success response
        return res.status(201).json({
            success: true,
            message: "Order placed successfully",
            data: order
        });

    } catch (error) {
        console.error("Create Order Error:", error);
        console.error("Error Code:", error.code);

        if (error.message?.startsWith("INSUFFICIENT_STOCK:")) {
            return res.status(400).json({
                success: false,
                message: `${error.message.split(":")[1]} is no longer available in the requested quantity`
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};
