// File: ShopSmart/backend/src/models/User.ts
import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// Define the interface for the User document
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Ensure _id is ObjectId type
  username: string;
  email: string;
  passwordHash: string;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema({
  // Mongoose automatically adds _id as ObjectId
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, {
  timestamps: true // Adds createdAt and updatedAt timestamps
});

// Hash password before saving (if setting plain password)
// UserSchema.pre<IUser>('save', async function (next) {
//   if (!this.isModified('password')) return next(); // Only hash if 'password' field exists and is modified
//   try {
//     const salt = await bcrypt.genSalt(10);
//     this.passwordHash = await bcrypt.hash(this.password, salt);
//     this.password = undefined; // Don't store plain password if hashing automatically
//     next();
//   } catch (error: any) {
//     next(error);
//   }
// });

// Method to compare entered password with the hashed password
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export default mongoose.model<IUser>('User', UserSchema);