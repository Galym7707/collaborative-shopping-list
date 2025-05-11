// File: C:\Users\galym\Desktop\ShopSmart\backend\src\models\List.ts
import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
// import { IUser } from './User'; // IUser не используется напрямую в IListItem или IList

// Интерфейс для элементов списка
export interface IListItem { // Убрал extends Document, т.к. это sub-schema
  _id: string;
  name: string;
  isBought: boolean;
  quantity?: number; // Опционально
  unit?: string;     // Опционально
  category?: string; // Опционально
  boughtBy?: mongoose.Types.ObjectId[]; // Опционально, для "кто купит"
}

// Схема для элементов списка
const ListItemSchema: Schema = new Schema<IListItem>({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true, trim: true },
  isBought: { type: Boolean, default: false },
  quantity: { type: Number, default: 1 },
  unit: { type: String, default: '' },
  category: { type: String, default: 'Uncategorized' },
  boughtBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });


// Интерфейс для документа списка
export interface IList extends Document {
  _id: string;
  owner: mongoose.Types.ObjectId; // Ссылка на User
  name: string;
  items: mongoose.Types.DocumentArray<IListItem & mongoose.Document>; // Типизируем как DocumentArray
  sharedWith: mongoose.Types.ObjectId[]; // Массив ID пользователей, с кем поделен
  createdAt: Date;
  updatedAt: Date;
}

// Схема для списка
const ListSchema: Schema = new Schema<IList>({
  _id: { type: String, default: uuidv4 },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  items: [ListItemSchema], // Используем схему для subdocuments
  sharedWith: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
}, {
  timestamps: true,
  _id: false,
});

ListSchema.index({ sharedWith: 1 });

export default mongoose.model<IList>('List', ListSchema);