// File: C:\Users\galym\Desktop\ShopSmart\backend\src\server.ts
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import type { ExtendedError } from 'socket.io/dist/namespace';

import aiRoutes from './routes/aiRoutes';
import authRoutes from './routes/authRoutes';
import listRoutes from './routes/listRoutes';
import { IUser } from './models/User';
import { protect } from './middleware/authMiddleware';

// 1) Загрузка .env
// dotenv.config({ path: path.resolve(__dirname, '../.env') });
// Попробуем более стандартный вызов, который ищет .env в корне проекта (или где запущен node)
// Если backend/ запускается из корня ShopSmart/, то он найдет ../.env
// Если backend/ запускается из самой папки backend/, то он найдет .env в ней же.
dotenv.config(); // <--- Пробуем так

// 2) Проверяем обязательные переменные
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'CLIENT_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`❌ FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

// Проверяем ключ Google AI (не фатально)
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
    origin: process.env.CLIENT_URL, // Убрали || '*' - если CLIENT_URL не задан, будет ошибка выше
    methods: ['GET','POST','PATCH','DELETE'],
  }
});

// Расширяем стандартный интерфейс Socket, добавляя user
interface SocketWithUser extends Socket {
    user?: IUser | { id: string; email: string; username?: string }; // Добавляем user к сокету
}

// 5) Мидлвары Express
app.use(cors({ origin: process.env.CLIENT_URL })); // Убрали || '*'
app.use(express.json());
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as Request & { io?: SocketIOServer }).io = io;
  next();
});

// 6) WebSocket Middleware и Логика
// проверяем authToken при каждом подключении сокета
io.use((socket, next: (err?: ExtendedError) => void) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string);
    socket.data.user = payload;          // кладём user‑инфу на сокет
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return next(new Error('jwt_expired'));   // ↩ сообщаем причину
    }
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket: SocketWithUser) => { // Используем расширенный тип
  console.log(`🔌 WS connected: ${socket.id}, User: ${socket.user?.email}`);

  // --- АВТОМАТИЧЕСКИЙ ВХОД В КОМНАТУ ПОЛЬЗОВАТЕЛЯ ---
  if (socket.user?.id) {
      const userRoom = `user_${socket.user.id}`;
      console.log(`[WS] Socket ${socket.id} automatically joining room: ${userRoom}`);
      socket.join(userRoom);
  } else {
      console.warn(`[WS] Cannot join user room for socket ${socket.id}: User ID missing.`);
  }

  
  socket.on('joinList', async (listId: string) => { // Сделаем async для проверки прав
    if (!socket.user?.id) return console.error(`WS Error [${socket.id}]: No user found on socket for joinList.`);
    if (listId && typeof listId === 'string') {
        try {
            // Проверка прав доступа пользователя к списку перед подпиской
            const list = await mongoose.model('List').findOne({
                _id: listId,
                $or: [
                    { owner: socket.user.id },
                    { sharedWith: socket.user.id }
                ]
            }).select('_id').lean(); // Запрашиваем только ID для проверки

            if (list) {
                console.log(`User ${socket.user?.email} joining room: list_${listId}`);
                socket.join(`list_${listId}`);
            } else {
                console.warn(`WS Auth Denied [${socket.id}]: User ${socket.user?.email} tried to join unauthorized list ${listId}`);
                // Опционально: отправить сообщение об ошибке клиенту
                // socket.emit('error', { message: 'Unauthorized to join this list' });
            }
        } catch (error) {
            console.error(`WS Error [${socket.id}]: DB error checking permissions for list ${listId}`, error);
        }

    } else {
        console.warn(`WS Warn [${socket.id}]: Invalid listId received for joinList:`, listId);
    }
  });

  socket.on('leaveList', (listId: string) => {
    if (listId && typeof listId === 'string') {
        console.log(`User ${socket.user?.email} leaving room: list_${listId}`);
        socket.leave(`list_${listId}`);
    }
  });

  // --- УБРАЛИ ОБРАБОТКУ 'action' ---

  socket.on('disconnect', reason => {
    console.log(`❌ WS disconnected: ${socket.id} (${socket.user?.email}), Reason: ${reason}`);
  });

  socket.on('error', (err) => {
      console.error(`WS Socket Error [${socket.id}], User: ${socket.user?.email}:`, err);
  });
});

// 7) API-роуты
app.get('/api', (_req, res) => res.send('ShopSmart API is running'));
app.use('/api/auth', authRoutes);
app.use('/api/lists', listRoutes); // Защита внутри роутера listRoutes
// Защищаем AI роут с помощью middleware 'protect'
app.use('/api/ai', protect, aiRoutes);

// 8) Раздача фронтенда (Оставляем без изменений, если нужно)
// const clientDistPath = path.resolve(__dirname, '../../frontend/dist'); // Путь к билду фронтенда
// if (fs.existsSync(clientDistPath)) {
//     console.log(`Serving static files from: ${clientDistPath}`);
//     app.use(express.static(clientDistPath));
//     // Отправляем index.html для всех не-API GET запросов (для SPA роутинга)
//     app.get(/^(?!\/api).*/, (req, res) => {
//         res.sendFile(path.join(clientDistPath, 'index.html'));
//     });
// } else {
//     console.warn(`Frontend build directory not found at: ${clientDistPath}. Static file serving disabled.`);
// }


// 9) Глобальный обработчик ошибок (Оставляем без изменений)
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