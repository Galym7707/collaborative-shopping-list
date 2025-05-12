// File: frontend/src/components/AddItemForm.tsx
import React, { useState } from 'react';
import { useListStore } from '@/store/listStore';
import { Unit, Item } from '@/store/listTypes';
import toast from 'react-hot-toast';

interface Props {
  listId: string;
}

const AddItemForm: React.FC<Props> = ({ listId }) => {
  const addItem = useListStore(s => s.addItem);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<Unit>('pcs');
  const [category, setCategory] = useState('Uncategorized');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required');
      return;
    }
    try {
      await addItem(listId, name.trim(), quantity, unit, category);
      setName('');
      setQuantity(1);
      setUnit('pcs');
      setCategory('Uncategorized');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add item');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Item Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          placeholder="Enter item name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</label>
        <input
          type="number"
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          min="1"
          className="mt-1 w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
        <select
          value={unit}
          onChange={e => setUnit(e.target.value as Unit)}
          className="mt-1 w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        >
          <option value="pcs">Pieces</option>
          <option value="kg">Kilograms</option>
          <option value="l">Liters</option>
          <option value="m">Meters</option>
          <option value="pack">Pack</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          placeholder="Enter category"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        Add Item
      </button>
    </form>
  );
};

export default AddItemForm;