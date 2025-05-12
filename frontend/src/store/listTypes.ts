// File: frontend/src/store/listTypes.ts
export type Unit = 'pcs' | 'kg' | 'l' | 'm' | 'pack';

export interface UserInfo {
  _id: string;
  username: string;
  email: string;
  token?: string;
}

export interface Item {
  _id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: string;
  isBought: boolean;
  boughtBy: UserInfo | null;
}

export interface SharedWithEntry {
  _id: string;
  username: string;
  email: string;
  role: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined';
}

export interface List {
  _id: string;
  name: string;
  owner: UserInfo;
  items: Item[];
  sharedWith: SharedWithEntry[];
}

export interface Invitation {
  listId: string;
  listName: string;
  inviterId: string;
  inviterUsername: string;
  inviterEmail: string;
  role?: 'viewer' | 'editor';
}