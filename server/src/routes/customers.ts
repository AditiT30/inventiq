import { Router } from 'express';
import {
    createCustomerHandler,
    deleteCustomerHandler,
    getAllCustomersHandler,
    getCustomerByIdHandler,
    updateCustomerHandler
} from "../controllers/customerController.js";

const router = Router();

router.get('/', getAllCustomersHandler);
router.get('/:customer_id', getCustomerByIdHandler);
router.post('/', createCustomerHandler);
router.patch('/:customer_id', updateCustomerHandler);
router.delete('/:customer_id', deleteCustomerHandler);

export default router;
