// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\components\ShoppingList.tsx
import React from 'react';
import { Item } from '../store/listTypes';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { SwipeableListItem, SwipeAction, TrailingActions } from 'react-swipeable-list';
import 'react-swipeable-list/dist/styles.css';

interface ShoppingListProps {
  listId: string;
  items : Item[];
  onToggleItem: (listId: string, itemId: string, currentIsBought: boolean) => void; // Правильная сигнатура
  onRemoveItem: (listId: string, itemId: string) => void;
}

// const money = (n?: number) => n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 }); // Убираем, если цены не используются

export default function ShoppingList({ listId, items, onToggleItem, onRemoveItem }: ShoppingListProps) {
  const { t } = useTranslation();

  // Убираем rows и grandTotal, если pricePerUnit и totalCost не используются
  // const rows = items.map(i => {
  //   const qty   = i.quantity     ?? 1;
  //   return { ...i, qty };
  // });
  // const grandTotal = 0; // Заглушка

  if (!items.length) // Проверяем items напрямую
    return ( <div className="p-4 italic text-gray-500">{t('shoppingList.empty')}</div> );

  const handleRemove = (itemId: string) => { onRemoveItem(listId, itemId); };

  const trailingActions = (itemId: string) => (
    <TrailingActions> <SwipeAction destructive={true} onClick={() => handleRemove(itemId)}> <div className="bg-red-500 text-white flex items-center justify-center px-4 h-full rounded-r-lg"> <TrashIcon className="h-5 w-5" /> </div> </SwipeAction> </TrailingActions>
  );

  return (
    <ul className="space-y-3">
      {items.map(item => ( // Используем item напрямую
        <SwipeableListItem key={item._id} trailingActions={trailingActions(item._id)}>
          <li className={`flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-opacity duration-300 ${item.isBought ? 'opacity-50' : 'opacity-100'}`}>
            <div className="flex items-center flex-grow mr-4 min-w-0">
              <label htmlFor={`item-check-${item._id}`} className="flex items-center cursor-pointer">
                  <input type="checkbox" id={`item-check-${item._id}`} checked={item.isBought} onChange={() => onToggleItem(listId, item._id, item.isBought)} className="sr-only peer" />
                   <div className={`mr-3 h-5 w-5 rounded border-2 flex-shrink-0 ${item.isBought ? 'bg-blue-500 border-blue-500' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'} peer-focus:ring-2 peer-focus:ring-blue-400 dark:peer-focus:ring-blue-500 transition flex items-center justify-center`}> {item.isBought && <CheckIcon className="h-3 w-3 text-white" />} </div>
                  <span className={`text-gray-800 dark:text-gray-100 break-words ${item.isBought ? 'line-through text-gray-500 dark:text-gray-400' : ''}`}>{item.name}</span>
              </label>
            </div>
            {(item.quantity && item.quantity > 1 || item.unit && item.unit !== 'pcs') && ( <div className="text-sm text-gray-500 dark:text-gray-400 mx-2 flex-shrink-0"> {item.quantity}{item.unit && t(`units.${item.unit}`, item.unit)} </div> )}
            {item.category && item.category !== 'Uncategorized' && ( <div className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300 mx-2 flex-shrink-0"> {t(`categories.${item.category}`, item.category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))} </div> )}
            <button onClick={() => handleRemove(item._id)} className="ml-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0" title={t('common.delete')}><TrashIcon className="h-4 w-4" /></button>
          </li>
        </SwipeableListItem>
      ))}
    </ul>
    // Убираем таблицу, если она не нужна без цен
  );
}