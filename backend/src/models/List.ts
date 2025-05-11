// File: C:\Users\galym\Desktop\ShopSmart\backend\src\models\List.ts
import mongoose, { Document, Schema, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Интерфейс для элементов списка
export interface IListItem {
  _id: string;
  name: string;
  isBought: boolean;
  quantity?: number;
  unit?: string;
  category?: string;
  // boughtBy?: Types.ObjectId[]; // Пока уберем для упрощения
}

// Схема для элементов списка
const ListItemSchema: Schema = new Schema<IListItem>({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true, trim: true },
  isBought: { type: Boolean, default: false },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: '' },
  category: { type: String, default: 'Uncategorized' },
  // boughtBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

// Добавить интерфейс для sharedWith
export interface ISharedWith {
  user: Types.ObjectId;
  role: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined';
}

const SharedWithSchema: Schema = new Schema<ISharedWith>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' }
}, { _id: false });

// Интерфейс для документа списка
export interface IList extends Document {
  _id: string;
  owner: Types.ObjectId; // Ссылка на User
  name: string;
  items: Types.DocumentArray<IListItem & Document>; // Типизируем как DocumentArray
  sharedWith: { user: Types.ObjectId, role: 'viewer' | 'editor', status: 'pending' | 'accepted' | 'declined' }[];
  createdAt: Date;
  updatedAt: Date;
}

// Схема для списка
const ListSchema: Schema = new Schema<IList>({
  _id: { type: String, default: uuidv4 },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  items: [ListItemSchema],
  sharedWith: [SharedWithSchema],
}, {
  timestamps: true,
  _id: false,
});

// ListSchema.index({ sharedWith: 1 }); // Индекс уже есть в определении поля

export default mongoose.model<IList>('List', ListSchema);