import { Router } from 'express';
import { prisma } from '../lib/db.js';
const router = Router();

// GET all products
router.get('/', async (req, res, next) => {
    try {
        const products = await prisma.product.findMany();
        res.json(products);
    } catch (error) {
        next(error);
    }
});

export default router;