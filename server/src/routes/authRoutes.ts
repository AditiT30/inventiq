//only public route in stack , handles the login and provides the JWT token

import { Router } from 'express';
import { login } from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

export default router;