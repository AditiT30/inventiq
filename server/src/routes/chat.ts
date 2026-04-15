import { Router } from "express";

import { askProductAssistantHandler } from "../controllers/chatController.js";

const router = Router();

router.post("/products", askProductAssistantHandler);

export default router;
