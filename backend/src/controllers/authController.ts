// File: C:\Users\galym\Desktop\ShopSmart\backend\src\controllers\authController.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User, { IUser } from '../models/User';

const JWT_EXPIRATION_SECONDS = process.env.JWT_EXPIRES_IN_SECONDS
    ? parseInt(process.env.JWT_EXPIRES_IN_SECONDS, 10)
    : 7 * 24 * 60 * 60; // 7 дней по умолчанию

function signToken(id: string, email: string, username: string): string {
  const secret: Secret = process.env.JWT_SECRET!;
  if (!secret) {
      console.error('FATAL ERROR inside signToken: JWT_SECRET is not set');
      throw new Error('Server configuration error: JWT_SECRET missing during token signing');
  }
  const payload = { id, email, username };
  const options: SignOptions = { expiresIn: JWT_EXPIRATION_SECONDS };
  return jwt.sign(payload, secret, options);
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) { return res.status(400).json({ message: 'Please add all fields (username, email, password)' }); }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        let message = 'User already exists';
        if (existingUser.email === email) message = 'User with this email already exists';
        if (existingUser.username === username) message = 'User with this username already exists';
      return res.status(400).json({ message });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = new User({ username, email, passwordHash });
    await user.save();
    const token = signToken(user._id.toString(), user.email, user.username);
    res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) { console.error("Registration Error:", err); next(err); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) { return res.status(400).json({ message: 'Please add all fields (email, password)' }); }
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) { return res.status(401).json({ message: 'Invalid credentials' }); }
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
        console.error(`Login Error: User ${email} found but has missing or invalid passwordHash.`);
        return res.status(401).json({ message: 'Invalid credentials (error code: HASH_MISSING)' });
    }
    const isValid = await user.comparePassword(password);
    if (!isValid) { return res.status(401).json({ message: 'Invalid credentials' }); }
    const token = signToken(user._id.toString(), user.email, user.username);
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err: any) {
     console.error("Login Error:", err.message);
     return res.status(401).json({ message: 'Invalid credentials (error code: COMPARE_FAIL)' });
  }
}