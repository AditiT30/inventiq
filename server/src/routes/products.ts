import { Router } from 'express';
import {
    createProductHandler,
    deleteProductHandler,
    getAllProductsHandler,
    getProductByCodeHandler,
    updateProductHandler
} from "../controllers/productController.js";
const router = Router();

router.get('/', getAllProductsHandler);
router.get('/:product_code', getProductByCodeHandler);
router.post('/', createProductHandler);
router.patch('/:product_code', updateProductHandler);
router.delete('/:product_code', deleteProductHandler);

export default router;
