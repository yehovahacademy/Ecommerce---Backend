
import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

const DUMMY_JSON_URL = `${process.env.DUMMY_JSON_API_URL}/products?limit=0`;

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

const seedDummyJSON = async () => {
    try {
        console.log("Fetching products from DummyJSON...");

        const response = await fetch(DUMMY_JSON_URL);

        if (!response.ok) {
            throw new Error(`DummyJSON API error: ${response.status}`);
        }

        const data = await response.json();
        const products = data.products;

        console.log(`Found ${products.length} products`);

        for (const item of products) {
            // 1. Create or reuse the category
            const categoryName = item.category;

            const category = await prisma.category.upsert({
                where: {
                    name: categoryName,
                },
                update: {},
                create: {
                    name: categoryName,
                    slug: slugify(categoryName),
                },
            });

            // 2. Prepare product images
            const imageUrls =
                item.images?.length > 0
                    ? item.images
                    : [item.thumbnail];

            // 3. Create or update the product
            await prisma.product.upsert({
                where: {
                    sku: `DUMMY-${item.id}`,
                },

                update: {
                    name: item.title,
                    description: item.description,
                    price: item.price,
                    stock: item.stock,
                    categoryId: category.id,
                    isActive: true,

                    images: {
                        deleteMany: {},
                        create: imageUrls.map((imageUrl, index) => ({
                            imageUrl,
                            altText: item.title,
                            sortOrder: index,
                        })),
                    },
                },

                create: {
                    name: item.title,
                    slug: `dummyjson-${item.id}`,
                    description: item.description,
                    sku: `DUMMY-${item.id}`,
                    price: item.price,
                    stock: item.stock,
                    isActive: true,

                    categoryId: category.id,

                    images: {
                        create: imageUrls.map((imageUrl, index) => ({
                            imageUrl,
                            altText: item.title,
                            sortOrder: index,
                        })),
                    },
                },
            });

            console.log(`Imported: ${item.title}`);
        }

        console.log("DummyJSON products imported successfully!");
    } catch (error) {
        console.error("DummyJSON seeding failed:", error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
};

seedDummyJSON();
