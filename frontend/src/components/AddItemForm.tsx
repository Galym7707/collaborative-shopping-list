// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\components\AddItemForm.tsx
import React, { useState } from 'react';
import { useTranslation }   from 'react-i18next';
import { PlusIcon }         from '@heroicons/react/24/solid';
import { useListStore }     from '../store/listStore';
import { Unit }             from '../store/listTypes'; // Убедись, что Unit экспортируется
import { CATEGORIES, CategoryKey } from '../constants/categories'; // Создай этот файл

// Создай файл src/constants/categories.ts, если его нет:
/*
// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\constants\categories.ts
export const CATEGORIES = [ 'other', 'toiletries', 'fruitsVegetables', 'dairyCheese', 'bakery' ] as const;
export type CategoryKey = typeof CATEGORIES[number];
*/

const UNITS: Unit[] = ['pcs', 'kg', 'l', 'm', 'pack'];

interface Props { listId: string }

const AddItemForm: React.FC<Props> = ({ listId }) => {
  const { t }      = useTranslation();
  const addItemAPI = useListStore(s => s.addItemAPI);

  const [name, setName]           = useState('');
  const [qty,  setQty]            = useState<number>(1);
  const [unit, setUnit]           = useState<Unit>('pcs');
  // const [ppu,  setPpu]            = useState<number | ''>(''); // Убрали
  const [cat,  setCat]            = useState<CategoryKey>('other');
  const [loading, setLoading]     = useState(false);

  const reset = () => { setName(''); setQty(1); setUnit('pcs'); setCat('other'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || loading) return;
    setLoading(true);
    await addItemAPI(listId, {
      name: trimmedName,
      quantity: qty,
      unit,
      category: cat,
      // pricePerUnit и totalCost не передаем, если их нет в Item
    });
    reset();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input className="input flex-grow" placeholder={t('addItemForm.placeholder', 'Enter item…')} value={name} onChange={e => setName(e.target.value)} disabled={loading} />
      <select className="input w-36" value={cat} onChange={e => setCat(e.target.value as CategoryKey)} disabled={loading}>
        {CATEGORIES.map(key => ( <option key={key} value={key}> {t(`categories.${key}`, key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))} </option> ))}
      </select>
      <input type="number" min="1" step="1" className="input w-20" title={t('addItemForm.qty', 'Qty')} value={qty} onChange={e => setQty(Math.max(1, +e.target.value))} disabled={loading} />
      <select className="input w-20" value={unit} onChange={e => setUnit(e.target.value as Unit)} disabled={loading}>
        {UNITS.map(u => ( <option key={u} value={u}> {t(`units.${u}`, u)} </option> ))}
      </select>
      <button type="submit" className="btn btn-primary p-3" disabled={loading || !name.trim()}> <PlusIcon className="h-5 w-5"/> </button>
    </form>
  );
};
export default AddItemForm;