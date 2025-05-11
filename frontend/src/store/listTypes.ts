// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listTypes.ts

// Тип пользователя (упрощенный, для отображения)
export interface UserInfo {
  _id: string;
  username: string;
  email: string;
}

// Тип элемента списка
export interface Item {
  _id: string;
  name: string;
  isBought: boolean;
  quantity?: number;
  unit?: string;     // Тип Unit определен ниже, если используется
  category?: string; // Тип CategoryKey определен в constants/categories.ts
  // pricePerUnit?: number; // Убрано, если нет на бэке
  // totalCost?: number;    // Убрано, если нет на бэке
  boughtBy?: string[]; // Массив ID пользователей (строк)
}

// Тип для sharedWith в List, если бэкенд возвращает массив объектов с user, role, status
export interface SharedWithEntry {
_id?: string; // Mongoose subdocuments могут иметь _id
user: UserInfo; // Бэкенд должен возвращать populated user
role: 'viewer' | 'editor';
status: 'pending' | 'accepted' | 'declined';
}

// Полный тип списка
export interface List {
  _id: string;
  name: string;
  owner: UserInfo;
  items: Item[];
  sharedWith: SharedWithEntry[]; // Используем SharedWithEntry, если бэкенд возвращает такую структуру
  // sharedWith: UserInfo[]; // ИЛИ так, если бэкенд возвращает просто массив UserInfo (как в нашем упрощенном варианте)
  createdAt: string;
  updatedAt: string;
}

// Тип для приглашений
export interface Invitation {
listId: string;
listName: string;
inviterUsername: string;
inviterEmail: string;
role?: 'viewer' | 'editor';
}

// Тип для единиц измерения, если он используется в AddItemForm
export type Unit = 'pcs' | 'kg' | 'l' | 'm' | 'pack' | string; // Добавил string для гибкости