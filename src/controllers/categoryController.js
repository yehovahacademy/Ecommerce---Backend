import crypto from "node:crypto";
import {prisma } from "../config/prisma.js";

export const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

//CREATE CATEGORY

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryName = name.trim();

    const existingCategory = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: "Category already exists",
      });
    }

    const slugBase = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;

    const category = await prisma.category.create({
      data: {
        name: categoryName,
        slug,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

//UPDATE CATEGORY

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const categoryId = id.trim();
    const categoryName = name.trim();

    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const duplicateCategory = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (duplicateCategory && duplicateCategory.id !== categoryId) {
      return res.status(409).json({
        success: false,
        message: "Another category already uses this name",
      });
    }

    const updateData = {
      name: categoryName,
    };

    if (categoryName !== existingCategory.name) {
      const slugBase = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      updateData.slug = `${slugBase}-${crypto.randomUUID().slice(0, 8)}`;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Update category error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Category name or slug already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update category",
    });
  }
};

//DELETE CATEGORY

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const categoryId = id.trim();

    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productCount = await prisma.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Cannot delete a category containing products",
      });
    }

    await prisma.category.delete({
      where: { id: categoryId },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete category",
    });
  }
};