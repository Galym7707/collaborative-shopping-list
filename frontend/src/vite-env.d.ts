// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\vite-env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    // добавь другие VITE_ переменные, если они есть
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }