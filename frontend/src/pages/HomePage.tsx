// File: frontend/src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListStore } from '@/store/listStore';
import toast from 'react-hot-toast';
import { List, Unit } from '@/store/listTypes';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    lists,
    fetchLists,
    createList,
    deleteList,
    addItem,
    removeDuplicates,
    isLoadingLists,
    error,
  } = useListStore(state => ({
    lists: state.lists,
    fetchLists: state.fetchLists,
    createList: state.createList,
    deleteList: state.deleteList,
    addItem: state.addItem,
    removeDuplicates: state.removeDuplicates,
    isLoadingLists: state.isLoadingLists,
    error: state.error,
  }));

  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) {
      toast.error('List name is required');
      return;
    }
    try {
      const newList = await createList(newListName.trim());
      toast.success(`List "${newList.name}" created!`);
      navigate(`/list/${newList._id}`);
      setNewListName('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm('Are you sure you want to delete this list?')) return;
    try {
      await deleteList(listId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete list');
    }
  };

  const handleGenerateItems = async (listId: string) => {
    const generatedItems: { name: string; quantity: number; unit: Unit; category: string }[] = [
      { name: 'Milk', quantity: 2, unit: 'l', category: 'Dairy' },
      { name: 'Bread', quantity: 1, unit: 'pcs', category: 'Bakery' },
      { name: 'Eggs', quantity: 12, unit: 'pcs', category: 'Dairy' },
    ];
    try {
      for (const item of generatedItems) {
        await addItem(listId, item.name, item.quantity, item.unit, item.category);
      }
      await removeDuplicates(listId);
      toast.success(`Added ${generatedItems.length} items to list!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate items');
    }
  };

  if (isLoadingLists) {
    return <div>Loading lists...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Shopping Lists</h1>
      <div className="mb-4">
        <input
          type="text"
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          placeholder="Enter new list name"
          className="mr-2 rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
        />
        <button
          onClick={handleCreateList}
          className="bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700"
        >
          Create List
        </button>
      </div>
      {lists.length === 0 ? (
        <p className="text-gray-500">No lists yet. Create one above!</p>
      ) : (
        <ul className="space-y-2">
          {lists.map((list: List) => (
            <li key={list._id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
              <span
                className="cursor-pointer text-blue-600 hover:underline"
                onClick={() => navigate(`/list/${list._id}`)}
              >
                {list.name}
              </span>
              <div>
                <button
                  onClick={() => handleGenerateItems(list._id)}
                  className="text-sm text-green-600 hover:text-green-700 mr-2"
                >
                  Generate Items
                </button>
                <button
                  onClick={() => handleDeleteList(list._id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HomePage;