
import { prisma } from "../config/prisma.js";

const slugify = (value) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

// Validate image URLs safely
const isHttpUrl = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
};

// Fetch products from external providers
const getExternalProducts = async (source) => {
    let url;

    if (source === "dummyjson") {
        url = `${process.env.DUMMY_JSON_API_URL}/products?limit=0`;
    } else if (source === "fakestore") {
        url = `${process.env.FAKE_STORE_API_URL}/products`;
    } else if (source === "openapi") {
        url = process.env.OPENAPI_DATA_API_URL;
    } else {
        throw new Error("Unsupported product source");
    }

    if (!url) {
        throw new Error(`API URL is not configured for ${source}`);
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`External API returned ${response.status}`);
    }

    const data = await response.json();

    if (source === "dummyjson") {
        return data.products;
    }

    // Fake Store and OpenAPI Data return arrays.
    return data;
};

// 1. Preview DummyJSON products
export const previewDummyJSON = async (req, res) => {
    try {
        const products = await getExternalProducts("dummyjson");

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("DummyJSON preview error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to fetch DummyJSON products",
        });
    }
};

// 2. Preview Fake Store products
export const previewFakeStore = async (req, res) => {
    try {
        const products = await getExternalProducts("fakestore");

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("Fake Store preview error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to fetch Fake Store products",
        });
    }
};

// 3. Preview OpenAPI Data products
export const previewOpenAPI = async (req, res) => {
    try {
        const products = await getExternalProducts("openapi");

        return res.status(200).json({
            success: true,
            count: products.length,
            products,
        });
    } catch (error) {
        console.error("OpenAPI preview error:", error);

        return res.status(502).json({
            success: false,
            message: "Unable to fetch OpenAPI products",
        });
    }
};

// 4. Import selected products
export const importProducts = async (req, res) => {
    try {
        const { source, productIds } = req.body;

        const supportedSources = [
            "dummyjson",
            "fakestore",
            "openapi",
        ];

        if (
            !supportedSources.includes(source) ||
            !Array.isArray(productIds) ||
            productIds.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid source and productIds array are required",
            });
        }

        const uniqueIds = [...new Set(productIds)];

        if (
            uniqueIds.length > 100 ||
            uniqueIds.some(
                (id) => !Number.isSafeInteger(id) || id <= 0
            )
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Product IDs must be positive integers. Maximum 100 per import.",
            });
        }

        // Fetch products again from the external API.
        // Never trust product details or prices submitted by the frontend.
        const externalProducts = await getExternalProducts(source);

        if (!Array.isArray(externalProducts)) {
            throw new Error("Invalid external API response");
        }

        const selectedProducts = externalProducts.filter((product) =>
            uniqueIds.includes(product.id)
        );

        if (selectedProducts.length !== uniqueIds.length) {
            return res.status(400).json({
                success: false,
                message: "One or more selected products were not found",
            });
        }

        const imported = [];
        const skipped = [];

        const skuPrefixes = {
            dummyjson: "DUMMY",
            fakestore: "FS",
            openapi: "OPENAPI",
        };

        for (const item of selectedProducts) {
            // Validate essential external product fields.
            if (
                typeof item.title !== "string" ||
                !item.title.trim() ||
                typeof item.description !== "string" ||
                !item.description.trim() ||
                typeof item.price !== "number" ||
                !Number.isFinite(item.price) ||
                item.price <= 0
            ) {
                skipped.push({
                    externalId: item.id,
                    reason: "Invalid product details",
                });
                continue;
            }

            const sku = `${skuPrefixes[source]}-${item.id}`;

            // Prevent duplicate imports.
            const existingProduct = await prisma.product.findUnique({
                where: { sku },
                select: { id: true },
            });

            if (existingProduct) {
                skipped.push({
                    externalId: item.id,
                    reason: "Product already exists",
                });
                continue;
            }

            const categoryName =
                typeof item.category === "string"
                    ? item.category.trim()
                    : "";

            if (!categoryName) {
                skipped.push({
                    externalId: item.id,
                    reason: "Product category is missing",
                });
                continue;
            }

            // Create category if it does not already exist.
            const categorySlug = slugify(categoryName);

            // Match on name (unique): categories created in the admin panel
            // get a random slug suffix, so matching on slug would miss them
            // and the create would fail on the unique name constraint.
            const category = await prisma.category.upsert({
                where: {
                    name: categoryName,
                },
               update: {},
               create: {
                 name: categoryName,
                 slug: categorySlug,
                 },
            });

            // Handle provider-specific image formats.
            let imageUrls = [];

            if (source === "dummyjson") {
                imageUrls = item.images?.length
                    ? item.images
                    : [item.thumbnail];
            } else {
                imageUrls = [item.image];
            }

            // Skip invalid image URLs without failing the import.
            const validImages = imageUrls.filter(isHttpUrl);

            // DummyJSON supplies stock.
            // Fake Store and OpenAPI use an initial stock of 50.
            const stock =
                source === "dummyjson"
                    ? (
                        Number.isSafeInteger(item.stock) && item.stock >= 0
                            ? item.stock
                            : 50
                    )
                    : 50;

            const product = await prisma.product.create({
                data: {
                    name: item.title.trim(),
                    slug: `${source}-${item.id}`,
                    description: item.description,
                    sku,
                    price: item.price,
                    stock,

                    // Admin must publish the product separately.
                    isActive: false,

                    categoryId: category.id,

                    images: {
                        create: validImages.map(
                            (imageUrl, index) => ({
                                imageUrl,
                                altText: item.title.trim(),
                                sortOrder: index,
                            })
                        ),
                    },
                },
            });

            imported.push(product);
        }

        return res.status(201).json({
            success: true,
            message: "Product import completed",
            importedCount: imported.length,
            skippedCount: skipped.length,
            imported,
            skipped,
        });
    } catch (error) {
        console.error("Product import error:", error);

        return res.status(500).json({
            success: false,
            message: "Product import failed",
        });
    }
};
