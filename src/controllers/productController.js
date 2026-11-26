
import "dotenv/config";
import { prisma } from "../config/prisma.js";
import crypto from "node:crypto";
import { FAKE_STORE_API_URL } from "../config/externalApis.js";

// CREATE PRODUCT
export const createProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            stock,
            categoryId,
            sku,
            isActive
        } = req.body;

        // Validate isActive
        if (
            isActive !== undefined &&
            typeof isActive !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "isActive must be a boolean"
            });
        }

        // Validate name
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }

        // Validate SKU
        if (typeof sku !== "string" || !sku.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product SKU is required"
            });
        }

        // Validate description
        if (typeof description !== "string" || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product description is required"
            });
        }

        // Validate price
        if (
            price === undefined ||
            price === null ||
            !Number.isFinite(Number(price)) ||
            Number(price) <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Product price must be greater than zero"
            });
        }

        // Validate stock
        if (
            stock === undefined ||
            stock === null ||
            !Number.isInteger(Number(stock)) ||
            Number(stock) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Stock must be a non-negative integer"
            });
        }

        // Validate category ID
        if (typeof categoryId !== "string" || !categoryId.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid category ID is required"
            });
        }

        const normalizedCategoryId = categoryId.trim();

        const existingCategory = await prisma.category.findUnique({
            where: { id: normalizedCategoryId }
        });

        if (!existingCategory) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Generate unique slug
        const slugBase = name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

        const product = await prisma.product.create({
            data: {
                name: name.trim(),
                slug,
                sku: sku.trim(),
                description: description.trim(),
                price: Number(price),
                stock: Number(stock),
                isActive: isActive ?? true,
                category: {
                    connect: {
                        id: normalizedCategoryId
                    }
                }
            },
            include: {
                category: true,
                images: true
            }
        });

        return res.status(201).json({
            success: true,
            product,
            message: "Product created successfully"
        });

    } catch (error) {
        console.error("Create product error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A product with this SKU or slug already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET ALL PRODUCTS
// Public storefront: only active products
export const getAllProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                isActive: true
            },
            include: {
                category: true,
                images: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            products,
            message: "Products loaded successfully"
        });

    } catch (error) {
        console.error("Get public products error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// ADMIN: GET ACTIVE AND INACTIVE PRODUCTS
export const getAdminProducts = async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            include: {
                category: true,
                images: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return res.status(200).json({
            success: true,
            products,
            message: "Admin products loaded successfully"
        });

    } catch (error) {
        console.error("Get admin products error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET PRODUCT BY ID
export const getProductsById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid product Id is required"
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: id.trim()
            },
            include: {
                category: true,
                images: true
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        return res.status(200).json({
            success: true,
            data: product,
            message: "Fetched the product successfully"
        });

    } catch (error) {
        console.error("Couldn't fetch the productId", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product"
        });
    }
};


// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            categoryId,
            price,
            stock,
            sku,
            isActive
        } = req.body;

        const { id } = req.params;

        // Validate product ID
        if (typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid product ID is required"
            });
        }

        const productId = id.trim();

        // Check whether product exists
        const existingProduct = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const updateData = {};

        // Validate and update name
        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Product name must not be empty"
                });
            }

            const slugBase = name
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");

            updateData.name = name.trim();
            updateData.slug =
                `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
        }

        // Validate and update description
        if (description !== undefined) {
            if (
                typeof description !== "string" ||
                !description.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Product description must not be empty"
                });
            }

            updateData.description = description.trim();
        }

        // Validate and update price
        if (price !== undefined) {
            if (
                price === null ||
                !Number.isFinite(Number(price)) ||
                Number(price) <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Product price must be greater than zero"
                });
            }

            updateData.price = Number(price);
        }

        // Validate and update stock
        if (stock !== undefined) {
            if (
                stock === null ||
                !Number.isInteger(Number(stock)) ||
                Number(stock) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Stock must be a non-negative integer"
                });
            }

            updateData.stock = Number(stock);
        }

        // Validate and update SKU
        if (sku !== undefined) {
            if (typeof sku !== "string" || !sku.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Valid SKU is required"
                });
            }

            updateData.sku = sku.trim();
        }

        // Validate and update category
        if (categoryId !== undefined) {
            if (
                typeof categoryId !== "string" ||
                !categoryId.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Valid category ID is required"
                });
            }

            const normalizedCategoryId = categoryId.trim();

            const existingCategory = await prisma.category.findUnique({
                where: {
                    id: normalizedCategoryId
                }
            });

            if (!existingCategory) {
                return res.status(404).json({
                    success: false,
                    message: "Category not found"
                });
            }

            updateData.category = {
                connect: {
                    id: normalizedCategoryId
                }
            };
        }

        // Validate and update isActive
        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "isActive must be a boolean"
                });
            }

            updateData.isActive = isActive;
        }

        // Prevent empty updates
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update"
            });
        }

        // Update product
        const updatedProduct = await prisma.product.update({
            where: {
                id: productId
            },
            data: updateData,
            include: {
                category: true,
                images: true
            }
        });

        return res.status(200).json({
            success: true,
            product: updatedProduct,
            message: "Product updated successfully"
        });

    } catch (error) {
        console.error("Update product error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "SKU or slug already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// DELETE A PRODUCT (SOFT DELETE)
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID first
        if (typeof id !== "string" || !id.trim()) {
            return res.status(400).json({
                success: false,
                message: "Valid product ID is required"
            });
        }

        // Find product
        const existingProduct = await prisma.product.findUnique({
            where: { id: id.trim() }
        });

        if (!existingProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Soft delete
        const product = await prisma.product.update({
            where: { id: id.trim() },
            data: {
                isActive: false
            }
        });

        return res.status(200).json({
            success: true,
            message: "Product deactivated successfully",
            product
        });

    } catch (error) {
        console.error("Delete product error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// GET EXTERNAL PRODUCTS (FAKE STORE)
export const getExternalProducts = async (req, res) => {
    try {
        const externalProducts = await fetch(
            `${FAKE_STORE_API_URL}/products`
        );

        if (!externalProducts.ok) {
            return res.status(502).json({
                success: false,
                message: "Failed to fetch External products"
            });
        }

        const response = await externalProducts.json();

        return res.status(200).json({
            success: true,
            products: response,
            message: "External Products fetched Successfully"
        });

    } catch (error) {
        console.error("Failed to Load External Products", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server error"
        });
    }
};
