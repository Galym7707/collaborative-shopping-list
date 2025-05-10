// File: C:\Users\galym\Desktop\ShopSmart\backend\src\controllers\authController.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'; // <-- Импортируем bcrypt
import User, { IUser } from '../models/User';

const EXPIRES = process.env.JWT_EXPIRES_IN || '365d';

// Подписываем токен прямо здесь, читая секрет из process.env
function signToken(id: string, email: string, username: string) { // Добавим username в токен, если нужно
  const secret = process.env.JWT_SECRET;
  if (!secret) {
      // В реальном приложении лучше выбросить ошибку или завершить процесс
      console.error('FATAL ERROR: JWT_SECRET is not set');
      throw new Error('Server configuration error: JWT_SECRET missing');
  }
  // В payload можно добавить и другие нечувствительные данные, например username
  return jwt.sign({ id, email, username }, secret, { expiresIn: EXPIRES });
}

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = req.body; // <-- Получаем username

    // Проверяем наличие всех полей
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please add all fields (username, email, password)' }); // Обновили сообщение
    }

    // Проверка существующего пользователя по email ИЛИ username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        let message = 'User already exists';
        if (existingUser.email === email) message = 'User with this email already exists';
        if (existingUser.username === username) message = 'User with this username already exists';
      return res.status(400).json({ message });
    }

    // --- Хеширование пароля ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    // ------------------------

    // Создаем пользователя с хешированным паролем
    const user = new User({
        username,
        email,
        passwordHash // <-- Сохраняем хеш
    });
    await user.save();

    // Подписываем токен
    const token = signToken(user._id.toString(), user.email, user.username);

    // Возвращаем токен и объект пользователя (без хеша пароля)
    res.status(201).json({
        token,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
        }
    });

  } catch (err) {
    console.error("Registration Error:", err); // Логируем ошибку
    next(err); // Передаем дальше для обработки ошибок
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please add all fields (email, password)' }); // Обновили сообщение
    }

    // Ищем пользователя по email и явно запрашиваем passwordHash
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // --- ДОБАВЛЕНА ПРОВЕРКА ---
    // Убедимся, что passwordHash существует и является строкой перед сравнением
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
        console.error(`Login Error: User ${email} found but has missing or invalid passwordHash.`);
        return res.status(401).json({ message: 'Invalid credentials (error code: HASH_MISSING)' }); // Неверные данные (проблема с аккаунтом)
    }
    // -------------------------

    // Сравниваем пароль
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Подписываем токен
    const token = signToken(user._id.toString(), user.email, user.username);

    // Возвращаем токен и объект пользователя (без хеша пароля)
    res.json({
        token,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
        }
     });
  } catch (err: any) { // Добавил 'any' для доступа к message
     console.error("Login Error:", err.message); // Логируем только сообщение об ошибке bcrypt
     // Не передаем err дальше, так как это внутренняя ошибка bcrypt,
     // а пользователю возвращаем стандартную ошибку авторизации
     return res.status(401).json({ message: 'Invalid credentials (error code: COMPARE_FAIL)' });
     // или next(err); если хочешь, чтобы глобальный обработчик ошибок вернул 500
  }
}