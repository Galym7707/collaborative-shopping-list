import { Schema, model, Types, Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/* ───────────── Item ───────────── */
export interface IItem {
  _id         : string; // UUID
  name        : string;
  quantity    : number;
  unit        : string;
  pricePerUnit: number | undefined;
  totalCost   : number | undefined;
  category    : string;
  isBought    : boolean;
  boughtBy    : Types.ObjectId[];
}

const ListItemSchema = new Schema<IItem>({
  _id         : { type: String, default: uuid },
  name        : { type: String, required: true, trim: true },
  quantity    : { type: Number, default: 1 },
  unit        : { type: String, default: 'pcs' },
  pricePerUnit: { type: Number },
  totalCost   : { type: Number },
  category    : { type: String, default: 'Без категории' },
  isBought    : { type: Boolean, default: false },
  boughtBy    : [{ type: Schema.Types.ObjectId, ref: 'User' }],
});

/* ───────────── Shared entry ───── */
export interface ISharedWith {
  user   : Types.ObjectId;
  role   : 'viewer' | 'editor';
  status : 'pending' | 'accepted' | 'declined';
}

const SharedWithSchema = new Schema<ISharedWith>(
  {
    user  : { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role  : { type: String, enum: ['viewer', 'editor'],   default: 'viewer'   },
    status: { type: String, enum: ['pending','accepted','declined'],
                                            default: 'pending' },
  },
  { _id: false }
);

/* ───────────── List ───────────── */
export interface IList extends Document {
  _id       : string;
  owner     : Types.ObjectId;
  name      : string;
  items     : IItem[];
  sharedWith: ISharedWith[];           // <-- новый тип
}

const ListSchema = new Schema<IList>(
  {
    _id  : { type: String, default: uuid },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name : { type: String, required: true },

    items     : [ListItemSchema],
    sharedWith: [SharedWithSchema],    // <-- вложенная под‑схема
  },
  { timestamps: true }
);

export default model<IList>('List', ListSchema);
