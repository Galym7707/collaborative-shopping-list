// File: C:\Users\galym\Desktop\ShopSmart\backend\src\routes\aiRoutes.ts
import express from 'express';
import { getAiSuggestion } from '../controllers/aiController';
// Защита 'protect' применяется в server.ts перед использованием этого роутера

const router = express.Router();

// POST /api/ai/suggest
router.post('/suggest', getAiSuggestion);

export default router;