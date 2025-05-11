// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listTypes.ts

export interface UserInfo {
  _id: string;
  username: string;
  email: string;
}

export interface Item {
  _id: string;
  name: string;
  isBought: boolean;
  quantity?: number;
  unit?: string;
  category?: string;
  // pricePerUnit?: number; // УБРАНО
  // totalCost?: number;    // УБРАНО
  boughtBy?: string[];
}

export interface SharedWithEntry {
_id?: string;
user: UserInfo;
role: 'viewer' | 'editor';
status: 'pending' | 'accepted' | 'declined';
}

export interface List {
  _id: string;
  name: string;
  owner: UserInfo;
  items: Item[];
  sharedWith: SharedWithEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
listId: string;
listName: string;
inviterUsername: string;
inviterEmail: string;
role?: 'viewer' | 'editor';
}

export type Unit = 'pcs' | 'kg' | 'l' | 'm' | 'pack' | string;