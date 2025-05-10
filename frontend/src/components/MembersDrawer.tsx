import React from 'react';
import { UserIcon, PencilSquareIcon } from '@heroicons/react/24/solid';
import { IList }                      from '../store/listTypes';
import { useTranslation }             from 'react-i18next';
import { useListStore }               from '../store/listStore';
import toast                          from 'react-hot-toast';
import { api }                        from '../api';

interface Props {
  list   : IList;
  onClose: () => void;
}

const roleMeta = {
  owner : { icon: UserIcon,         color: 'text-yellow-500 w-5 h-5' },
  editor: { icon: PencilSquareIcon, color: 'text-blue-500   w-5 h-5' },
  viewer: { icon: UserIcon,         color: 'text-gray-400   w-5 h-5' },
} as const;

export default function MembersDrawer({ list, onClose }: Props) {
  const { t }            = useTranslation();
  const fetchListById    = useListStore(s => s.fetchListById);

  const handleRoleChange = async (userId: string, newRole: 'viewer' | 'editor') => {
    try {
      await api(`/lists/${list._id}/role/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      await fetchListById(list._id);
      toast.success(t('members.roleChanged', 'Role updated'));
    } catch {
      toast.error(t('members.roleChangeError', 'Failed to change role'));
    }
  };

  const handleRemove     = async (userId: string) => {
    if (!window.confirm(t('members.confirmRemove', 'Remove user?'))) return;
    try {
      await api(`/lists/${list._id}/share/${userId}`, { method: 'DELETE' });
      await fetchListById(list._id);
      toast.success(t('members.removed', 'User removed'));
    } catch {
      toast.error(t('members.removeError', 'Failed to remove user'));
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <aside className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 p-6 shadow-xl z-50">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('members.title', 'Participants')}
        </h2>

        <MemberRow
          name={list.owner.username}
          email={list.owner.email}
          role="owner"
          t={t}
        />
        <div className="border-t my-2" />

        {list.sharedWith.map(e => (
          <MemberRow
            key={e.user._id}
            name={e.user.username}
            email={e.user.email}
            role={e.role}
            status={e.status}
            t={t}
            userId={e.user._id}
            listId={list._id}
            onRoleChange={handleRoleChange}
            onRemove={handleRemove}
          />
        ))}
      </aside>
    </>
  );
}

interface RowProps {
  name   : string;
  email  : string;
  role   : 'viewer' | 'editor' | 'owner';
  status?: 'pending' | 'accepted' | 'declined';
  t      : any;
  userId?: string;
  listId?: string;
  onRoleChange?: (u: string, r: 'viewer'|'editor') => void;
  onRemove?: (u: string) => void;
}

function MemberRow({ name, email, role, status, t, userId, listId, onRoleChange, onRemove }: RowProps) {
  const { icon: Icon, color } = roleMeta[role];

  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className={color} />
      <div className="flex-grow min-w-0">
        <p className="truncate font-medium text-gray-900 dark:text-gray-100">{name}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
      </div>

      {status === 'pending'   && <span className="badge-yellow">{t('members.pending','Waiting')}</span>}
      {status === 'accepted'  && <span className="badge-green">✓ {t('members.accepted','Accepted')}</span>}
      {status === 'declined'  && <span className="badge-red">{t('members.declined','Declined')}</span>}

      {role !== 'owner' && userId && listId && (
        <div className="flex gap-1 ml-2">
          <button onClick={() => onRoleChange?.(userId, role==='viewer'?'editor':'viewer')} className="badge-blue">
            {role==='viewer' ? 'Editor' : 'Viewer'}
          </button>
          <button onClick={() => onRemove?.(userId)} className="badge-red">✕</button>
        </div>
      )}
    </div>
  );
}
