import React, { useState, useEffect, useCallback } from 'react';
import { useListStore } from '../store/listStore';
import { XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { List, SharedWithEntry } from '../store/listTypes';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: {
    _id: string;
    name: string;
    sharedWith: { _id: string; email: string; role: 'viewer' | 'editor'; status: 'pending' | 'accepted' | 'declined' }[];
  };
}

const ShareListModal: React.FC<ShareListModalProps> = ({ isOpen, onClose, list }) => {
  const invite = useListStore(s => s.inviteUserToListAPI);
  const fetchListById = useListStore(s => s.fetchListById);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('viewer');
    }
  }, [isOpen]);

  const handleShare = useCallback(async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    setBusy(true);
    try {
      await invite(list._id, email.trim(), role);
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail('');
      await fetchListById(list._id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invitation');
    } finally {
      setBusy(false);
    }
  }, [email, invite, list._id, role, fetchListById]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative z-10 w-full max-w-lg rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl animate-modal-enter">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          aria-label="Close modal"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="mb-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Share "{list.name}"
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              type="email"
              disabled={busy}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="input mt-1 w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Permission level
            </label>
            <select
              disabled={busy}
              value={role}
              onChange={e => setRole(e.target.value as 'viewer' | 'editor')}
              className="input mt-1 w-full"
            >
              <option value="viewer">Viewer – can view only</option>
              <option value="editor">Editor – can make changes</option>
            </select>
          </div>

          <button
            onClick={handleShare}
            disabled={busy}
            className="btn btn-primary w-full"
          >
            {busy ? 'Sending…' : 'Send Invitation'}
          </button>
        </div>

        {list.sharedWith.length > 0 && (
          <section className="mt-6">
            <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
              Already Invited
            </h3>
            <ul className="space-y-2">
              {list.sharedWith.map(u => (
                <li
                  key={u._id}
                  className="flex items-center bg-gray-50 dark:bg-gray-700 p-2 rounded"
                >
                  <div className="text-sm text-gray-900 dark:text-gray-100 truncate flex items-center">
                    {u.email}
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${
                        u.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : u.status === 'accepted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}
                    >
                      {u.status === 'pending'
                        ? 'Pending'
                        : u.status === 'accepted'
                          ? 'Accepted'
                          : 'Declined'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
};

export default ShareListModal;
