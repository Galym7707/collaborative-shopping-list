// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listTypes.ts

import mongoose from 'mongoose'; // Импортируем mongoose для Types.ObjectId, если используется на фронте

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
    unit?: string;
    category?: string;
    boughtBy?: string[]; // Массив ID пользователей (строк)
}

// Тип для sharedWith в List, если ты используешь сложную структуру
export interface SharedWithEntry {
  user: UserInfo; // или string (ID пользователя), если не делаешь populate на фронте
  role: 'viewer' | 'editor';
  status: 'pending' | 'accepted' | 'declined';
}

// Полный тип списка
export interface List {
    _id: string;
    name: string;
    owner: UserInfo;
    items: Item[];
    // sharedWith: SharedWithEntry[]; // Если используешь сложную структуру
    sharedWith: UserInfo[]; // Если бэкенд возвращает массив UserInfo после populate
    createdAt: string;
    updatedAt: string;
}

// Тип для приглашений, если используется
export interface Invitation {
  listId: string;
  listName: string;
  inviterUsername: string;
  inviterEmail: string;
  role?: 'viewer' | 'editor'; // Добавляем роль, если она передается
}