// File: frontend/src/components/ShoppingList.tsx
import React            from 'react';
import { Item }         from '../store/listTypes';
import { useListStore } from '../store/listStore';
import {
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

interface Props {
  listId: string;
  items : Item[];
}

/* форматирование денег / прочерка */
const money = (n?: number) =>
  n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function ShoppingList({ listId, items }: Props) {
  const { t } = useTranslation();
  /* API‑методы из zustand‑store */
  const toggle  = useListStore(s => s.toggleItemAPI);
  const remove  = useListStore(s => s.removeItemAPI);

  /* если backend ещё не посчитал totalCost – делаем на лету */
  const rows = items.map(i => {
    const qty   = i.quantity     ?? 1;
    const ppu   = i.pricePerUnit ?? 0;
    const total = i.totalCost    ?? qty * ppu;
    return { ...i, qty, ppu, total };
  });

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  if (!rows.length)
    return (
      <div className="p-4 italic text-gray-500">{t('shoppingList.empty')}</div>
    );

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left">
          <th className="w-8"></th>
          <th>Item</th>
          <th>Category</th>
          <th>Qty</th>
          <th>₸/u</th>
          <th>Sum</th>
          <th className="w-8"></th>
        </tr>
      </thead>

      <tbody>
        {rows.map(r => (
          <tr key={r._id} className="border-b">
            {/* чекбокс куплено */}
            <td>
              <button
                onClick={() => toggle(listId, r._id)}
                title="Mark bought / un‑bought"
                className="p-0.5"
              >
                {r.isBought ? (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <span className="inline-block h-5 w-5 rounded border" />
                )}
              </button>
            </td>

            {/* название */}
            <td className={r.isBought ? 'line-through opacity-60' : ''}>
              {r.name}
            </td>

            {/* категория */}
            <td className={r.isBought ? 'line-through opacity-60' : ''}>
              {r.category ?? '—'}
            </td>

            {/* кол-во */}
            <td>{r.qty} {r.unit}</td>

            {/* цена */}
            <td>{money(r.ppu)}</td>

            {/* сумма */}
            <td>{money(r.total)}</td>

            {/* удалить */}
            <td>
              <button
                onClick={() => remove(listId, r._id)}
                className="text-red-600 hover:text-red-800"
                title="Delete"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>

      <tfoot>
        <tr>
          <td colSpan={5} className="text-right font-semibold">
            Total:
          </td>
          <td>{money(grandTotal)} ₸</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );
}
