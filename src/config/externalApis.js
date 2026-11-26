// Base URLs of the external product APIs. Each can be overridden with an
// environment variable; the defaults are used when the variable is not set
// (for example on Render), instead of requesting "undefined/products".
const withoutTrailingSlash = (value) => value.trim().replace(/\/+$/, "");

export const FAKE_STORE_API_URL = withoutTrailingSlash(
    process.env.FAKE_STORE_API_URL || "https://fakestoreapi.com"
);

export const DUMMY_JSON_API_URL = withoutTrailingSlash(
    process.env.DUMMY_JSON_API_URL || "https://dummyjson.com"
);

export const OPENAPI_DATA_API_URL = withoutTrailingSlash(
    process.env.OPENAPI_DATA_API_URL || "https://openapidata.github.io/api/v1/products.json"
);
