// File: frontend/src/pages/ProfilePage.tsx
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useListStore } from '@/store/listStore';
import toast from 'react-hot-toast';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { invitations, fetchInvitations, acceptInvitationAPI, declineInvitationAPI } = useListStore(state => ({
    invitations: state.invitations,
    fetchInvitations: state.fetchInvitations,
    acceptInvitationAPI: state.acceptInvitationAPI,
    declineInvitationAPI: state.declineInvitationAPI,
  }));

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleAccept = async (listId: string) => {
    try {
      await acceptInvitationAPI(listId);
      toast.success('Invitation accepted!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
    }
  };

  const handleDecline = async (listId: string) => {
    try {
      await declineInvitationAPI(listId);
      toast.success('Invitation declined!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline invitation');
    }
  };

  if (!user) {
    return <div>Please log in</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <p>Username: {user.username}</p>
      <p>Email: {user.email}</p>
      <button
        onClick={logout}
        className="mt-4 bg-red-600 text-white rounded-md py-2 px-4 hover:bg-red-700"
      >
        Logout
      </button>
      <h2 className="text-xl font-semibold mt-6 mb-2">Invitations</h2>
      {invitations.length === 0 ? (
        <p className="text-gray-500">No invitations</p>
      ) : (
        <ul className="space-y-2">
          {invitations.map(invitation => (
            <li
              key={invitation.listId}
              className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded"
            >
              <span>
                {invitation.listName} (Invited by {invitation.inviterUsername})
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleAccept(invitation.listId)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(invitation.listId)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ProfilePage;