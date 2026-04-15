import { Router } from 'express';
import {
    createSupplierHandler,
    deleteSupplierHandler,
    getAllSuppliersHandler,
    getSupplierByIdHandler,
    updateSupplierHandler
} from "../controllers/supplierController.js";

const router = Router();

router.get('/', getAllSuppliersHandler);
router.get('/:supplier_id', getSupplierByIdHandler);
router.post('/', createSupplierHandler);
router.patch('/:supplier_id', updateSupplierHandler);
router.delete('/:supplier_id', deleteSupplierHandler);

export default router;
