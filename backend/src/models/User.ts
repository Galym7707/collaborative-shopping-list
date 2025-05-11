// File: C:\Users\galym\Desktop\ShopSmart\backend\src\models\User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs'; // <--- ИЗМЕНЕН ИМПОРТ

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  passwordHash: string;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, { timestamps: true });

// comparePassword теперь будет использовать bcryptjs
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model<IUser>('User', UserSchema);