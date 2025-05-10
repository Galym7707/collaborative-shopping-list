// File: C:\Users\galym\Desktop\ShopSmart\backend\src\middleware\authMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import List from '../models/List';

export async function protect(req: Request, res: Response, next: NextFunction) {
  try {
    const hdr = req.headers.authorization;
    if (!hdr?.startsWith('Bearer '))
      return res.status(401).json({ message: 'Not authorised' });

    const token = hdr.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      username?: string;
    };

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });

    // @ts‑ignore – расширяем
    req.user = user;

    // ─── Если это маршрут со списком ─────────────────────────────
    const listId = req.params.id;
    if (listId) {
      const list = await List.findById(listId).select('_id owner sharedWith');
      if (
        !list ||
        (list.owner.toString() !== user._id.toString() &&
          !list.sharedWith.map(String).includes(user._id.toString()))
      ) {
        return res.status(403).json({ message: 'No access to this list' });
      }
    }
    // ─────────────────────────────────────────────────────────────

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid' });
  }
}
