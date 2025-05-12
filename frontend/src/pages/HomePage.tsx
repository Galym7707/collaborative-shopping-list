// File: frontend/src/pages/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useListStore } from '@/store/listStore';
import toast from 'react-hot-toast';
import { List, Unit } from '@/store/listTypes';
import { useTranslation } from 'react-i18next';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      toast.error(t('homePage.enterListName'));
      return;
    }
    try {
      const newList = await createList(newListName.trim());
      toast.success(t('homePage.welcome', { name: newList.name }));
      navigate(`/list/${newList._id}`);
      setNewListName('');
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!window.confirm(t('words.delete') + '?')) return;
    try {
      await deleteList(listId);
      toast.success(t('listPage.cleaned'));
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
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
      toast.success(t('homePage.aiSuggestedItems'));
    } catch (err: any) {
      toast.error(err.message || t('homePage.aiError'));
    }
  };

  if (isLoadingLists) {
    return <div>{t('common.loading')}</div>;
  }

  if (error) {
    return <div>{t('common.error')}: {error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('homePage.myLists')}</h1>
      <div className="mb-4">
        <input
          type="text"
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          placeholder={t('homePage.listNamePlaceholder')}
          className="input mr-2"
        />
        <button
          onClick={handleCreateList}
          className="btn btn-primary"
        >
          {t('homePage.createButton')}
        </button>
      </div>
      {lists.length === 0 ? (
        <p className="text-gray-500">{t('homePage.noLists')}</p>
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
                  {t('homePage.aiGenerateButton')}
                </button>
                <button
                  onClick={() => handleDeleteList(list._id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {t('common.delete')}
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