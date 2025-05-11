// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\components\MembersDrawer.tsx
import React from 'react';
import { UserIcon, PencilSquareIcon, XMarkIcon as XMarkSolid } from '@heroicons/react/24/solid';
import { List, SharedWithEntry, UserInfo } from '../store/listTypes'; // Используем List
import { useTranslation } from 'react-i18next';
import { useListStore } from '../store/listStore';
import toast from 'react-hot-toast';
// import { api } from '../api'; // Вызовы API теперь в сторе

interface Props {
  list: List; // Используем тип List
  onClose: () => void;
}

const roleMeta = { /* ... */ } as const;
type RoleKey = keyof typeof roleMeta;

export default function MembersDrawer({ list, onClose }: Props) {
  const { t } = useTranslation();
  const changeRoleAPI = useListStore(s => s.changeRoleAPI); // Заглушка в сторе, нужно будет реализовать API
  const removeUserFromListAPI = useListStore(s => s.removeUserFromListAPI);
  const fetchListById = useListStore(s => s.fetchListById);

  const handleRoleChange = async (userId: string, newRole: 'viewer' | 'editor') => {
    try {
      if (changeRoleAPI) { // Проверяем, что функция есть (если она еще заглушка)
        await changeRoleAPI(list._id, userId, newRole); // Передаем newRole
        await fetchListById(list._id);
        toast.success(t('members.roleChanged', 'Role updated'));
      } else { toast.error("Change role function not implemented yet."); }
    } catch (err: any) { toast.error(err.message || t('members.roleChangeError', 'Failed to change role')); }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm(t('members.confirmRemoveUser', `Are you sure you want to remove this user's access?`))) return;
    try {
      await removeUserFromListAPI(list._id, userId);
      // await fetchListById(list._id); // Стор обновится через WS или ответ API
    } catch (err: any) { toast.error(err.message || t('members.removeError', 'Failed to remove user')); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 p-6 shadow-xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex justify-between items-center mb-6"> <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100"> {t('members.title', 'List Members')} </h2> <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"> <XMarkSolid className="h-6 w-6 text-gray-500 dark:text-gray-400"/> </button> </div>
        <MemberRow name={list.owner.username} email={list.owner.email} role="owner" t={t} />
        <div className="border-t my-3 dark:border-gray-700" />
        {list.sharedWith.map((entry: SharedWithEntry) => ( // Типизируем entry
          <MemberRow key={entry.user._id} name={entry.user.username} email={entry.user.email} role={entry.role} status={entry.status} t={t} userId={entry.user._id} onRoleChange={handleRoleChange} onRemove={handleRemove} />
        ))}
        {list.sharedWith.length === 0 && ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">{t('members.notSharedYet', 'Not shared with anyone yet.')}</p> )}
      </aside>
    </>
  );
}

interface RowProps { /* ... (как было, но t типизирован) */ t: (key: string, fallback?: string) => string; }
function MemberRow({ name, email, role, status, t, userId, onRoleChange, onRemove }: RowProps) { /* ... (как было) ... */ }