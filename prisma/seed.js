
import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

const API_URL = process.env.FAKE_STORE_API_URL;

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

const seedProducts = async () => {
    try {
        if (!API_URL) {
            throw new Error("FAKE_STORE_API_URL is missing from .env");
        }

        // 1. Fetch products from Fake Store API
        const productResponse = await fetch(`${API_URL}/products`);

        if (!productResponse.ok) {
            throw new Error("Failed to fetch external products");
        }

        const externalProducts = await productResponse.json();

        console.log(`Fetched ${externalProducts.length} products`);

        // 2. Create categories and products
        for (const item of externalProducts) {

            // Create or find category
            const categoryName = item.category;

            const category = await prisma.category.upsert({
                where: {
                    name: categoryName
                },
                update: {},
                create: {
                    name: categoryName,
                    slug: slugify(categoryName)
                }
            });

            // Create or update product
            await prisma.product.upsert({
                where: {
                    sku: `FS-${item.id}`
                },

                update: {
                    name: item.title,
                    description: item.description,
                    price: item.price,
                    category: {
                        connect: { id: category.id }
                    },
                    images: {
                        deleteMany: {},
                        create: {
                            imageUrl: item.image,
                            altText: item.title,
                            sortOrder: 0
                        }
                    }
                },

                create: {
                    name: item.title,
                    slug: `fake-store-${item.id}`,
                    sku: `FS-${item.id}`,
                    description: item.description,
                    price: item.price,
                    stock: 50,
                    isActive: true,

                    category: {
                        connect: { id: category.id }
                    },

                    images: {
                        create: {
                            imageUrl: item.image,
                            altText: item.title,
                            sortOrder: 0
                        }
                    }
                }
            });

            console.log(`Imported: ${item.title}`);
        }

        console.log("Fake Store products seeded successfully!");

    } catch (error) {
        console.error("Seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

seedProducts();
