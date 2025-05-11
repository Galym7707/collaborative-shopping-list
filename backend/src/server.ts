// File: C:\Users\galym\Desktop\ShopSmart\backend\src\server.ts
import * as dotenv from 'dotenv';
import path from 'path';
// Загружаем .env СРАЗУ, указывая путь явно относительно ТЕКУЩЕГО файла (server.ts)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import type { ExtendedError } from 'socket.io/dist/namespace'; // Для типизации next в io.use

import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import listRoutes from './routes/listRoutes';
import { IUser } from './models/User'; // Для типизации socket.data.user
import { protect } from './middleware/authMiddleware';

// 2) Проверяем обязательные переменные
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`❌ FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}
if (!process.env.GOOGLE_API_KEY) {
  console.warn('⚠️ WARNING: GOOGLE_API_KEY is not set. AI features will be disabled.');
}

// Логи для отладки
console.log('🔑 MONGODB_URI set?', !!process.env.MONGODB_URI);
console.log('🔑 JWT_SECRET   set?', !!process.env.JWT_SECRET);
console.log('🔑 GOOGLE_API_KEY set?', !!process.env.GOOGLE_API_KEY);
console.log('CLIENT_URL:', process.env.CLIENT_URL);

// 3) Подключаемся к MongoDB
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// 4) Инициализация Express + HTTP + Socket.IO
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL!, // Убрали || '*' и добавили !, т.к. проверено выше
    methods: ['GET','POST','PATCH','DELETE'],
  }
});

// 5) Мидлвары Express
app.use(cors({ origin: process.env.CLIENT_URL! }));
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { io?: SocketIOServer }).io = io;
  next();
});

// 6) WebSocket Middleware и Логика
io.use((socket: Socket, next: (err?: ExtendedError) => void) => {
  const token = socket.handshake.auth?.token;
  const secret = process.env.JWT_SECRET!; // Добавили !, т.к. проверено выше

  if (!token) {
    console.log(`[WS Auth] No token provided by socket ${socket.id}`);
    return next(new Error('unauthorized_no_token'));
  }

  try {
    const payload = jwt.verify(token, secret) as IUser & {id: string}; // Указываем, что payload содержит поля IUser и id
    // Сохраняем данные пользователя в socket.data (рекомендованный способ в Socket.IO v3+)
    socket.data.user = { id: payload.id, email: payload.email, username: payload.username };
    console.log(`[WS Auth OK] Socket ${socket.id} authenticated as user ${payload.email}.`);
    next();
  } catch (err: any) {
    console.error(`[WS Auth Error] Socket ${socket.id} - Invalid token:`, err.message);
    if (err.name === 'TokenExpiredError') {
      return next(new Error('jwt_expired'));
    }
    return next(new Error('unauthorized_invalid_token'));
  }
});

io.on('connection', (socket: Socket) => { // Используем базовый Socket, данные пользователя в socket.data.user
  const connectedUser = (socket.data as { user?: {id:string, email?: string, username?: string } }).user;
  console.log(`🔌 WS connected: ${socket.id}, User: ${connectedUser?.email}`);

  if (connectedUser?.id) {
      const userRoom = `user_${connectedUser.id}`;
      console.log(`[WS] Socket ${socket.id} automatically joining room: ${userRoom}`);
      socket.join(userRoom);
  } else {
      console.warn(`[WS] Cannot join user room for socket ${socket.id}: User ID missing in socket.data.`);
  }

  socket.on('joinList', async (listId: string) => {
    if (!connectedUser?.id) return console.error(`[WS Error ${socket.id}] No user data on socket for joinList.`);
    if (listId && typeof listId === 'string') {
        try {
            const list = await mongoose.model('List').findOne({
                _id: listId,
                $or: [ { owner: connectedUser.id }, { sharedWith: connectedUser.id } ]
            }).select('_id').lean();
            if (list) {
                console.log(`[WS ${socket.id}] User ${connectedUser?.email} joining room: list_${listId}`);
                socket.join(`list_${listId}`);
            } else {
                console.warn(`[WS Auth Denied ${socket.id}] User ${connectedUser?.email} tried to join unauthorized list ${listId}`);
            }
        } catch (error) { console.error(`[WS Error ${socket.id}] DB error checking permissions for list ${listId}`, error); }
    } else { console.warn(`[WS Warn ${socket.id}] Invalid listId for joinList:`, listId); }
  });

  socket.on('leaveList', (listId: string) => {
    if (listId && typeof listId === 'string') {
        console.log(`[WS ${socket.id}] User ${connectedUser?.email} leaving room: list_${listId}`);
        socket.leave(`list_${listId}`);
    }
  });

  socket.on('disconnect', reason => {
    console.log(`❌ WS disconnected: ${socket.id} (${connectedUser?.email}), Reason: ${reason}`);
  });
  socket.on('error', (err) => {
      console.error(`[WS Socket Error ${socket.id}], User: ${connectedUser?.email}:`, err);
  });
});

// 7) API-роуты
app.get('/api', (_req, res) => res.send('ShopSmart API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes);
app.use('/api/ai', protect, aiRoutes);

// 8) Раздача фронтенда (закомментировано, если не нужно для бэкенд-сервера)
// ...

// 9) Глобальный обработчик ошибок
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('💥 ERROR:', err);
  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  if (err.details?.startsWith('[GoogleGenerativeAI Error]')) {
      message = `AI Service Error: ${err.message}`;
  }
  res.status(statusCode).json({ message });
});

// 10) Запуск
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});