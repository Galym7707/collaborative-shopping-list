import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useListStore } from '../store/listStore';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightOnRectangleIcon,
  InboxArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const invitations = useListStore(s => s.invitations);
  const acceptInvite = useListStore(s => s.acceptInvite);
  const declineInvite = useListStore(s => s.declineInvite);
  const fetchInvitations = useListStore(s => s.fetchInvitations);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (listId: string) => {
    await acceptInvite(listId);
    navigate(`/list/${listId}`);
  };

  const handleDecline = (listId: string) => {
    if (!user?._id) return;
    declineInvite(listId, user._id);
  };

  return (
    <div className="container max-w-3xl mx-auto space-y-10 pb-20">
      {/* CARD ▸ user info */}
      <section className="bg-white dark:bg-gray-800 shadow rounded-2xl p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex-shrink-0 h-20 w-20 rounded-full bg-blue-500 text-white flex items-center justify-center text-3xl font-bold uppercase">
          {user?.username?.charAt(0) ?? '?'}
        </div>
        <div className="flex-grow">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {user?.username}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
            {user?.email}
          </p>
          <p className="text-xs text-gray-400 mt-1">ID: {user?._id}</p>
        </div>
        <button
          onClick={logout}
          className="btn btn-secondary flex items-center gap-1"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          {t('header.logout', 'Logout')}
        </button>
      </section>

      {/* CARD ▸ invitations */}
      <section className="bg-white dark:bg-gray-800 shadow rounded-2xl p-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {t('profile.invites', 'Incoming invitations')}
        </h3>

        {invitations.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            {t('profile.noInvites', 'No pending invitations')}
          </p>
        )}

        {invitations.map(inv => (
          <div
            key={inv.listId}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-100">
                {inv.listName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {inv.inviterUsername} &lt;{inv.inviterEmail}&gt;
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 break-all mt-1">
                {inv.listId}
              </p>
            </div>

            <div className="flex gap-2">
              {/* accept */}
              <button
                onClick={() => handleAccept(inv.listId)}
                className="btn btn-primary flex items-center gap-1 px-3 py-1.5 text-xs"
              >
                <InboxArrowDownIcon className="h-4 w-4" />
                {t('profile.accept', 'Accept')}
              </button>

              {/* decline */}
              <button
                onClick={() => handleDecline(inv.listId)}
                className="btn btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
              >
                <XMarkIcon className="h-4 w-4" />
                {t('profile.decline', 'Decline')}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};

export default ProfilePage;
