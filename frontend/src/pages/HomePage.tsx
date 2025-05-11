// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\pages\HomePage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useListStore } from '../store/listStore';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
// Импортируем нужные иконки
import { UserGroupIcon, SparklesIcon, PlusCircleIcon, BeakerIcon, ShareIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import { TrashIcon as TrashIconOutline } from '@heroicons/react/24/outline'; // Для дубликатов
import { XCircleIcon } from '@heroicons/react/24/solid'; // Используем Solid крестик для удаления списка
import { List, Item } from '../store/listTypes';

type Unit = 'pcs' | 'kg' | 'l' | 'm' | 'pack';

const HomePage: React.FC = () => {
  const {
      lists,
      fetchLists,
      createList: createListAPI,
      isLoadingLists,
      error: listError,
      removeDuplicatesAPI,
      deleteListAPI, // Получаем экшен удаления
      addItemAPI, // Получаем экшен добавления элемента
      toggle, // Получаем экшен переключения статуса
      disconnectSocket,
      setLists,
      clearCurrentList
  } = useListStore();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // --- Стейты ---
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [isAddingGenerated, setIsAddingGenerated] = useState(false);

  // --- Эффекты ---
  useEffect(() => {
    fetchLists().catch(e => console.error('loadLists error:', e));
  }, [fetchLists]);

  // --- Обработчики ---
  // В файле frontend/src/pages/HomePage.tsx

// ... внутри HomePage:
const handleCreateList = async (e: React.FormEvent) => {
  e.preventDefault();
  setCreateError(null);
  if (!newListName.trim()) {
    setCreateError(t('homePage.enterListName'));
    return;
  }
  setIsCreatingList(true);

  try {
    // 1) создаём список
    const newList = await createListAPI(newListName.trim());

    // 2) на всякий случай -- проверяем, что API вернул реально список
    if (!newList) {
      throw new Error(t('common.error'));
    }

    // 3) очищаем форму
    setNewListName('');

    // 4) подтягиваем актуальный список списков из БД
    await fetchLists();

    // 5) уведомляем и переходим в свежесозданный список
    toast.success(`List "${newList.name}" created!`);
    navigate(`/list/${newList._id}`);
  } catch (err: any) {
    setCreateError(err.message || t('common.error'));
  } finally {
    setIsCreatingList(false);
  }
};


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewListName(e.target.value);
      if (createError) setCreateError(null);
  }

  const handleAskAI = async (e: React.MouseEvent<HTMLButtonElement>, type: 'suggest' | 'generateList') => {
      e.preventDefault();
      setSuggestion(null); setAiError(null); setGeneratedItems([]);
      if (!prompt.trim()) { toast.error(t('homePage.enterAiPrompt')); return; }
      setAiLoading(true);
      try {
          const res = await api<{ suggestion: string }>('/ai/suggest', { method: 'POST', body: JSON.stringify({ prompt, requestType: type }) });
          if (type === 'generateList') {
              const items = res.suggestion.split('\n').map(line => line.trim().replace(/^[-*]\s*/, '').trim()).filter(line => line.length > 0);
              if (items.length > 0) { setGeneratedItems(items); setSuggestion(null); toast.success(`AI suggested ${items.length} items!`); }
              else { setAiError(t('homePage.aiEmptyList')); toast.error(t('homePage.aiEmptyList')); }
          } else { const formattedSuggestion = res.suggestion.replace(/^[-*]\s*/gm, '• '); setSuggestion(formattedSuggestion); setGeneratedItems([]); }
      } catch (e: any) { const message = e.response?.data?.message || e.message || t('homePage.aiError'); setAiError(message); toast.error(message || 'Unknown error'); }
      finally { setAiLoading(false); }
  };

  const addGeneratedItemsToList = async () => {
      if (generatedItems.length === 0) return;
      const listNameFromPrompt = prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt || 'AI Generated List';
      setIsAddingGenerated(true);
      try {
          const newList = await createListAPI(listNameFromPrompt);
          if (!newList?._id) throw new Error("Failed to create list for generated items");
          const listId = newList._id;
          await Promise.all(generatedItems.map(itemName => addItemAPI(listId, { name: itemName })));
          toast.success(`Created list "${newList.name}" with ${generatedItems.length} items!`);
          setGeneratedItems([]); setPrompt('');
          navigate(`/list/${listId}`);
      } catch (e: any) { toast.error(e.message || "Failed to add generated items."); }
      finally { setIsAddingGenerated(false); }
  };

   const handleRemoveListDuplicates = useCallback(async (listId: string, listName: string) => {
        const toastId = `cleaning-${listId}`;
        toast.loading(`Cleaning "${listName}"...`, { id: toastId });
        await removeDuplicatesAPI(listId);
        toast.dismiss(toastId);
    }, [removeDuplicatesAPI]);

   const handleDeleteList = useCallback(async (listId: string, listName: string) => {
       if (window.confirm(t('homePage.confirmDelete', `Are you sure you want to delete the list "${listName}"?`))) {
            const toastId = `deleting-${listId}`;
            toast.loading(`Deleting list "${listName}"...`, { id: toastId });
            await deleteListAPI(listId);
            toast.dismiss(toastId);
       }
   }, [deleteListAPI, t]);

  // --- РЕНДЕР КОМПОНЕНТА ---
  return (
    <div className="space-y-8 pb-10">

      {/* Секция Создания Списка */}
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-indigo-900 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-gray-700 dark:text-gray-100">{t('homePage.createNewList')}</h2>
        <form onSubmit={handleCreateList} className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={newListName} onChange={handleNameChange} placeholder={t('homePage.listNamePlaceholder')} className={`flex-grow p-3 border rounded-lg dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${createError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`} required disabled={isCreatingList} aria-invalid={!!createError} aria-describedby={createError ? "list-name-error" : undefined} />
          <button type="submit" className="btn btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60" disabled={isCreatingList || !newListName.trim()}> <PlusCircleIcon className="h-5 w-5" /> {isCreatingList ? t('common.loading') : t('homePage.createButton')} </button>
        </form>
        {createError && <p id="list-name-error" className="text-red-600 mt-2 text-sm">{createError}</p>}
      </div>

       {/* AI Assistant */}
       <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4"> <BeakerIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400 mr-2 flex-shrink-0"/> <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{t('homePage.aiAssistantTitle')}</h3> </div>
          <div className="space-y-3">
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={t('homePage.aiPromptPlaceholder')} className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition" rows={3} disabled={aiLoading} />
               <div className="flex flex-wrap gap-3">
                  <button onClick={(e) => handleAskAI(e, 'suggest')} className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 disabled:opacity-60" disabled={aiLoading || !prompt.trim()}> <SparklesIcon className="h-5 w-5 opacity-80"/> {aiLoading ? t('common.loading') : t('homePage.aiAskButton', 'Suggest')} </button>
                  <button onClick={(e) => handleAskAI(e, 'generateList')} className="btn btn-secondary px-5 py-2.5 rounded-lg flex items-center gap-2 disabled:opacity-60" disabled={aiLoading || !prompt.trim()}> <ListBulletIcon className="h-5 w-5 opacity-80"/> {aiLoading ? t('common.loading') : t('homePage.aiGenerateButton', 'Generate List')} </button>
               </div>
          </div>
          {aiError && <p className="text-red-600 mt-3 text-sm">{aiError}</p>}
          {suggestion && !aiLoading && ( <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"> <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">{suggestion}</p> </div> )}
           {generatedItems.length > 0 && !aiLoading && (
               <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
                   <h4 className="font-semibold mb-2 text-green-800 dark:text-green-200">{t('homePage.aiSuggestedItems', 'AI Suggested Items:')}</h4>
                   <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200 mb-4"> {generatedItems.map((item, index) => <li key={index}>{item}</li>)} </ul>
                   <button onClick={addGeneratedItemsToList} className="btn btn-primary px-5 py-2 rounded-lg disabled:opacity-60" disabled={isAddingGenerated}> {isAddingGenerated ? t('common.loading') : t('homePage.aiAddToListButton', 'Create List with these items')} </button>
               </div>
           )}
      </div>

      {/* --- ИСПРАВЛЕННЫЙ БЛОК "Мои Списки" --- */}
      <div>
        <h2 className="text-2xl font-semibold mb-5 text-gray-800 dark:text-gray-100">{t('homePage.myLists')}</h2>
        {isLoadingLists && <p className="text-gray-500 dark:text-gray-400">{t('common.loading')}...</p>}
        {listError && !isLoadingLists && <p className="text-red-500">{t('common.error')}: {listError}</p>}
        {!isLoadingLists && lists.length === 0 && !listError && ( <p className="text-gray-600 dark:text-gray-400">{t('homePage.noLists')}</p> )}
        {!isLoadingLists && lists.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lists.map((list: List) => {
               const isOwner = user?._id === list.owner._id;
               const isSharedWithOthers = list.sharedWith && list.sharedWith.filter((e: any) => e._id !== user?._id).length > 0;
               const isSharedToMe = list.sharedWith && list.sharedWith.some((e: any) => e._id === user?._id);
              return (
              <div key={list._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-blue-500/20 dark:hover:shadow-blue-400/10 transition-all duration-300 overflow-hidden flex flex-col border border-transparent hover:border-blue-300 dark:hover:border-blue-700">
                <Link to={`/list/${list._id}`} className="block p-5 flex-grow hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate pr-2">{list.name}</h3>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                          {!isOwner && isSharedToMe && (<span title={t('homePage.sharedToMeTooltip')} className="text-green-500 dark:text-green-400"><UserGroupIcon className="h-5 w-5" /></span>)}
                          {isOwner && isSharedWithOthers && (<span title={t('homePage.sharedByMeTooltip')} className="text-blue-500 dark:text-blue-400"><ShareIcon className="h-5 w-5" /></span>)}
                      </div>
                   </div>
                   <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{isOwner ? t('homePage.youAreOwner') : `${t('homePage.owner')}: ${list.owner.username}`}</p>
                   <p className="text-sm text-gray-500 dark:text-gray-400">{t('homePage.itemsCount', { count: list.items?.length || 0 })}</p>
                </Link>
                 <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-2">
                       {/* Кнопка удаления дубликатов */}
                       <button onClick={(e) => {e.stopPropagation(); handleRemoveListDuplicates(list._id, list.name)}} className="text-gray-400 hover:text-yellow-600 dark:text-gray-500 dark:hover:text-yellow-400 p-1 rounded-full hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors text-xs flex items-center gap-1" title={t('homePage.removeDuplicatesTooltip')} disabled={isLoadingLists}>
                            <TrashIconOutline className="h-4 w-4"/>
                        </button>
                       {/* Кнопка удаления списка */}
                       {isOwner && (
                             <button onClick={(e) => {e.stopPropagation(); handleDeleteList(list._id, list.name)}} className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-xs flex items-center gap-1" title={t('homePage.deleteListTooltip')} disabled={isLoadingLists}>
                                <XCircleIcon className="h-4 w-4"/>
                            </button>
                        )}
                 </div>
              </div>
            )})}
          </div>
        )}
      </div>
      {/* --- КОНЕЦ БЛОКА "Мои Списки" --- */}

    </div> // Конец основного div
  );
};

export default HomePage;