// src/constants/categories.ts
export const CATEGORIES = [
    'other',
    'toiletries',
    'fruitsVegetables',
    'dairyCheese',
    'bakery',
  ] as const;
  
  export type CategoryKey = typeof CATEGORIES[number];
  