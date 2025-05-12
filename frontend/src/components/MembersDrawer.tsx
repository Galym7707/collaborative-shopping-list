// File: frontend/src/components/MembersDrawer.tsx
import React from 'react';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { List, SharedWithEntry } from '@/store/listTypes';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';
import { useListStore } from '@/store/listStore';
import toast from 'react-hot-toast';

interface Props {
  list: List;
  onClose: () => void;
}

const MembersDrawer: React.FC<Props> = ({ list, onClose }) => {
  const { t } = useTranslation();
  const changeRoleAPI = useListStore(s => s.changeRoleAPI);
  const removeUserFromListAPI = useListStore(s => s.removeUserFromListAPI);
  const fetchListById = useListStore(s => s.fetchListById);

  const handleRoleChange = async (userId: string, newRole: 'viewer' | 'editor') => {
    try {
      await changeRoleAPI(list._id, userId, newRole);
      await fetchListById(list._id);
      toast.success(t('members.roleChanged', 'Role updated'));
    } catch (err: any) {
      toast.error(err.message || t('members.roleChangeError', 'Failed to change role'));
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm(t('members.confirmRemoveUser', 'Are you sure you want to remove this user’s access?'))) return;
    try {
      await removeUserFromListAPI(list._id, userId);
      toast.success(t('members.userRemoved', 'User removed successfully'));
    } catch (err: any) {
      toast.error(err.message || t('members.removeError', 'Failed to remove user'));
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-gray-800 p-6 shadow-xl z-50 transform transition-transform duration-300 ease-in-out translate-x-0">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('members.title', 'List Members')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close drawer"
          >
            <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <MemberRow
          name={list.owner.username}
          email={list.owner.email}
          role="owner"
          t={t}
        />
        <div className="border-t my-3 dark:border-gray-700" />
        {list.sharedWith.map((entry: SharedWithEntry) => (
          <MemberRow
            key={entry._id}
            name={entry.username}
            email={entry.email}
            role={entry.role}
            status={entry.status}
            t={t}
            userId={entry._id}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
        {list.sharedWith.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            {t('members.notSharedYet', 'Not shared with anyone yet.')}
          </p>
        )}
      </aside>
    </>
  );
};

interface RowProps {
  name: string;
  email: string;
  role: 'owner' | 'viewer' | 'editor';
  status?: 'pending' | 'accepted' | 'declined';
  t: TFunction<'translation', undefined>;
  userId?: string;
  onRoleChange?: (userId: string, newRole: 'viewer' | 'editor') => void;
  onRemove?: (userId: string) => void;
}

function MemberRow({ name, email, role, status, t, userId, onRoleChange, onRemove }: RowProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
      <div className="flex items-center space-x-3">
        <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {role === 'owner' ? (
          <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {t('members.owner', 'Owner')}
          </span>
        ) : (
          <>
            <select
              value={role}
              onChange={e => onRoleChange?.(userId!, e.target.value as 'viewer' | 'editor')}
              className="text-xs rounded-md border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
              disabled={!onRoleChange}
            >
              <option value="viewer">{t('members.viewer', 'Viewer')}</option>
              <option value="editor">{t('members.editor', 'Editor')}</option>
            </select>
            <button
              onClick={() => onRemove?.(userId!)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
              aria-label={t('members.remove', 'Remove user')}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </>
        )}
        {status && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                : status === 'accepted'
                ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}
          >
            {status === 'pending'
              ? t('members.pending', 'Pending')
              : status === 'accepted'
              ? t('members.accepted', 'Accepted')
              : t('members.declined', 'Declined')}
          </span>
        )}
      </div>
    </div>
  );
}

export default MembersDrawer;