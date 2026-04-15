import { z } from "zod";
import { AppError } from "../errors/AppError.js";
import { prisma } from "../lib/db.js";
const askProductAssistantSchema = z.object({
    question: z.string().min(1, "question is required"),
    selected_product_code: z.string().min(1).optional(),
});
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const tokenize = (value) => value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
const scoreProduct = (product, terms) => {
    const haystack = `${product.product_code} ${product.name} ${product.description ?? ""}`.toLowerCase();
    return terms.reduce((score, term) => (haystack.includes(term) ? score + 1 : score), 0);
};
export const askProductAssistantHandler = async (req, res, next) => {
    try {
        if (!geminiApiKey) {
            throw new AppError("GEMINI_API_KEY is not configured on the server", 500);
        }
        const { question, selected_product_code } = askProductAssistantSchema.parse(req.body);
        const products = await prisma.product.findMany({
            orderBy: { last_updated: "desc" },
            take: 150,
        });
        const terms = tokenize(question);
        const rankedProducts = products
            .map((product) => ({
            product,
            score: scoreProduct(product, terms) +
                (selected_product_code && product.product_code === selected_product_code ? 4 : 0),
        }))
            .sort((left, right) => right.score - left.score || right.product.quantity - left.product.quantity);
        const relevantProducts = rankedProducts
            .filter((entry, index) => entry.score > 0 || index < 8)
            .slice(0, 8)
            .map((entry) => entry.product);
        const productContext = relevantProducts.length
            ? relevantProducts
                .map((product) => `Product Code: ${product.product_code}
Name: ${product.name}
Description: ${product.description ?? "N/A"}
Price INR: ${product.price}
Quantity In Stock: ${product.quantity}
Weight: ${product.weight}
Last Updated: ${product.last_updated.toISOString()}`)
                .join("\n\n---\n\n")
            : "No products found in the database.";
        const prompt = [
            "You are an inventory product assistant for an internal operations app.",
            "Answer only using the provided product database context.",
            "If the answer is not supported by the context, say that you cannot confirm it from the current product database.",
            "Be concise and operationally useful.",
            "",
            `Question:\n${question}`,
            "",
            `Selected Product Code:\n${selected_product_code ?? "None"}`,
            "",
            `Product Database Context:\n${productContext}`,
        ].join("\n");
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(geminiApiKey)}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
            }),
        });
        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            throw new AppError(`Gemini request failed: ${errorText || geminiResponse.statusText}`, 502);
        }
        const response = (await geminiResponse.json());
        const answer = response.candidates?.[0]?.content?.parts
            ?.map((part) => part.text ?? "")
            .join("")
            .trim() || "I couldn't generate an answer from the current product data.";
        res.json({
            answer,
            products: relevantProducts.map((product) => ({
                product_code: product.product_code,
                name: product.name,
                quantity: product.quantity,
                price: product.price,
            })),
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=chatController.js.map