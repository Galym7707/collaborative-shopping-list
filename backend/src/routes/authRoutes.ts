// File: C:\Users\galym\Desktop\ShopSmart\backend\src\routes\authRoutes.ts
import express from 'express'; // <-- ИСПРАВЛЕНО
import { register, login } from '../controllers/authController';

const router = express.Router(); // <-- ИСПРАВЛЕНО

router.post('/register', register);
router.post('/login', login);

export default router;