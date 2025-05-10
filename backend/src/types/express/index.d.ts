// File: ShopSmart/backend/src/types/express/index.d.ts

// Import the IUser interface from your User model
import { IUser } from '../../models/User';

// Extend the Express Request interface
declare global {
  namespace Express {
    export interface Request {
      user?: IUser; // Add the user property, making it optional
    }
  }
}

// If using TypeScript modules, you might need this empty export
// to ensure the file is treated as a module.
export {};