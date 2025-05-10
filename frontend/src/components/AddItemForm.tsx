// File: frontend/src/components/AddItemForm.tsx
import React, { useState } from 'react';
import { useTranslation }   from 'react-i18next';
import { PlusIcon }         from '@heroicons/react/24/solid';
import { useListStore }     from '../store/listStore';
import { Unit }             from '../store/listTypes';
import { CATEGORIES, CategoryKey } from '../constants/categories';

const UNITS: Unit[] = ['pcs', 'kg', 'l', 'm', 'pack'];

interface Props { listId: string }

const AddItemForm: React.FC<Props> = ({ listId }) => {
  const { t }      = useTranslation();
  const addItemAPI = useListStore(s => s.addItemAPI);

  const [name, setName]           = useState('');
  const [qty,  setQty]            = useState<number>(1);
  const [unit, setUnit]           = useState<Unit>('pcs');
  const [ppu,  setPpu]            = useState<number | ''>('');
  const [cat,  setCat]            = useState<CategoryKey>('other');
  const [loading, setLoading]     = useState(false);

  const price      = ppu === '' ? 0 : ppu;
  const totalLocal = qty * (price || 0);

  const reset = () => { setName(''); setQty(1); setPpu(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    await addItemAPI(listId, {
      name: trimmed,
      quantity: qty,
      unit,
      category: cat,
      pricePerUnit: ppu === '' ? undefined : price,
      totalCost: totalLocal || undefined,
    });
    reset();
    setLoading(false);
  };

  // Цена за единицу: переведём слово "₸ /"
  const unitLabel = `${t('addItem.priceUnit', '₸ /')} ${t(`units.${unit}`)}`;

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-center">
      <input
        className="input flex-grow"
        placeholder={t('addItem.placeholder', 'Enter item…')}
        value={name}
        onChange={e => setName(e.target.value)}
        disabled={loading}
      />

      <select
        className="input w-36"
        value={cat}
        onChange={e => setCat(e.target.value as CategoryKey)}
      >
        {CATEGORIES.map(key => (
          <option key={key} value={key}>
            {t(`words.${key}`)}
          </option>
        ))}
      </select>

      <input
        type="number" min="0" step="0.01"
        className="input w-20"
        title={t('addItem.qty', 'Qty')}
        value={qty}
        onChange={e => setQty(+e.target.value)}
      />

      <select
        className="input w-20"
        value={unit}
        onChange={e => setUnit(e.target.value as Unit)}
      >
        {UNITS.map(u => (
          <option key={u} value={u}>
            {t(`units.${u}`)}
          </option>
        ))}
      </select>

      <input
        type="number" min="0" step="0.01"
        className="input w-24"
        placeholder={unitLabel}
        title={unitLabel}
        value={ppu}
        onChange={e => setPpu(e.target.value === '' ? '' : +e.target.value)}
      />

      <button
        className="btn btn-primary"
        disabled={loading || !name.trim()}
      >
        <PlusIcon className="h-5 w-5"/>
      </button>

      {totalLocal > 0 && (
        <span className="text-sm font-medium text-gray-500 ml-2">
          = {totalLocal.toLocaleString()} ₸
        </span>
      )}
    </form>
  );
};

export default AddItemForm;
