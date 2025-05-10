//C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listTypes.ts: 
export interface UserLite {
    _id: string;
    username: string;
    email: string;
  }
  
  /* ────────────── единицы измерения ────────────── */
  export type Unit = 'pcs' | 'kg' | 'l' | 'm' | 'pack';
  
  /* ────────────── элемент списка ──────────────── */
  export interface Item {
    _id: string;
    name: string;
    isBought: boolean;
  
    quantity?: number;
    unit?: Unit;
    pricePerUnit?: number;
    totalCost?: number;

    category?: string;         // ← категория
    boughtBy: UserLite[];      // ← кто отметил покупку
  }
  
  export interface List {
    _id: string;
    name: string;
    owner: UserInfo;
    items: Item[];
    sharedWith: UserInfo[];
    createdAt: string;
    updatedAt: string;
  }
  