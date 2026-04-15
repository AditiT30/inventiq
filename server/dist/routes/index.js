//file aggregates all specific pages (Products, Orders)
/*
* Central Dispatcher for API.
* Instead of cluttering main app ,  use this "Master Router" to organize endpoints into logical groups
* */
//In ES Modules, Node.js requires the extension to be .js
import { Router } from 'express';
import productRoutes from './products.js';
import orderRoutes from './orders.js';
import customerRoutes from './customers.js';
import supplierRoutes from './suppliers.js';
import mfgRoutes from './manufacturing.js';
import historyRoutes from './history.js';
import authRoutes from './authRoutes.js';
import reorderRoutes from './reorder.js';
import dashboardRoutes from './dashboard.js';
import chatRoutes from './chat.js';
import eventsRoutes from './events.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
// Public routes
router.use('/auth', authRoutes);
router.use('/events', eventsRoutes);
//sub-routes here (require valid JWT)
router.use('/products', authMiddleware, productRoutes);
router.use('/orders', authMiddleware, orderRoutes);
router.use('/customers', authMiddleware, customerRoutes);
router.use('/suppliers', authMiddleware, supplierRoutes);
router.use('/batches', authMiddleware, mfgRoutes);
router.use('/history', authMiddleware, historyRoutes);
router.use("/reorder", authMiddleware, reorderRoutes);
router.use("/dashboard", authMiddleware, dashboardRoutes);
router.use("/chat", authMiddleware, chatRoutes);
// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'API is running' });
});
export default router;
//# sourceMappingURL=index.js.map