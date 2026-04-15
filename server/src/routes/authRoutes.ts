//only public route in stack , handles the login and provides the JWT token

import { Router } from 'express';
import { login, logout } from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);
router.post('/logout', authMiddleware, logout);

export default router;
