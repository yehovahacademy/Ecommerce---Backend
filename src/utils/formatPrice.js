const USD_TO_INR = 88; // Fixed prototype conversion rate

export const formatPrice = (usdPrice) => {
    const inrPrice = Number(usdPrice) * USD_TO_INR;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
    }).format(inrPrice);
};