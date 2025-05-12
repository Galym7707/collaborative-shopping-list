// File: frontend/src/store/listStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { api } from '@/api';
import { Invitation, Item, List } from './listTypes';

type ListSet = (fn: (state: ListState) => void) => void;
type ListGet = () => ListState;

interface ListState {
  lists: List[];
  currentList: List | null;
  invitations: Invitation[];
  isLoadingLists: boolean;
  isLoadingList: boolean;
  error: string | null;
  socket: Socket | null;
  fetchLists: () => Promise<void>;
  fetchListById: (listId: string) => Promise<void>;
  fetchInvitations: () => Promise<void>;
  createList: (name: string) => Promise<List>;
  deleteList: (listId: string) => Promise<void>;
  addItem: (listId: string, name: string, quantity?: number, unit?: Item['unit'], category?: string) => Promise<void>;
  toggleItem: (listId: string, itemId: string, currentIsBought: boolean) => Promise<void>;
  deleteItem: (listId: string, itemId: string) => Promise<void>;
  removeDuplicates: (listId: string) => Promise<void>;
  inviteUserToListAPI: (listId: string, email: string, role: 'viewer' | 'editor') => Promise<void>;
  removeUserFromListAPI: (listId: string, userId: string) => Promise<void>;
  changeRoleAPI: (listId: string, userId: string, newRole: 'viewer' | 'editor') => Promise<void>;
  acceptInvitationAPI: (listId: string) => Promise<void>;
  declineInvitationAPI: (listId: string) => Promise<void>;
  initializeSocket: (userId: string) => void;
  disconnectSocket: () => void;
}

export const useListStore = create<ListState>()(
  devtools(
    subscribeWithSelector(
      immer(
        (set: ListSet, get: ListGet): ListState => ({
          lists: [],
          currentList: null,
          invitations: [],
          isLoadingLists: false,
          isLoadingList: false,
          error: null,
          socket: null,

          fetchLists: async () => {
            set(state => {
              state.isLoadingLists = true;
              state.error = null;
            });
            try {
              const lists = await api<List[]>('/lists', { method: 'GET' });
              set(state => {
                state.lists = lists;
                state.isLoadingLists = false;
              });
            } catch (err: any) {
              const message = err.message || 'Failed to fetch lists';
              set(state => {
                state.error = message;
                state.isLoadingLists = false;
              });
              toast.error(message);
            }
          },

          fetchListById: async (listId: string) => {
            set(state => {
              state.isLoadingList = true;
              state.error = null;
            });
            try {
              const list = await api<List>(`/lists/${listId}`, { method: 'GET' });
              set(state => {
                state.currentList = list;
                state.isLoadingList = false;
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = list;
                else state.lists.push(list);
              });
            } catch (err: any) {
              const message = err.message || 'Failed to fetch list';
              set(state => {
                state.error = message;
                state.isLoadingList = false;
              });
              toast.error(message);
            }
          },

          fetchInvitations: async () => {
            try {
              const invitations = await api<Invitation[]>('/invitations', { method: 'GET' });
              set(state => {
                state.invitations = invitations;
              });
            } catch (err: any) {
              const message = err.message || 'Failed to fetch invitations';
              toast.error(message);
              throw err;
            }
          },

          createList: async (name: string) => {
            try {
              const newList = await api<List>('/lists', {
                method: 'POST',
                body: JSON.stringify({ name }),
              });
              set(state => {
                state.lists.push(newList);
                state.currentList = newList;
              });
              toast.success('List created successfully!');
              return newList;
            } catch (err: any) {
              const message = err.message || 'Failed to create list';
              toast.error(message);
              throw err;
            }
          },

          deleteList: async (listId: string) => {
            try {
              await api(`/lists/${listId}`, { method: 'DELETE' });
              set(state => {
                state.lists = state.lists.filter(l => l._id !== listId);
                if (state.currentList?._id === listId) state.currentList = null;
              });
              toast.success('List deleted successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to delete list';
              toast.error(message);
              throw err;
            }
          },

          addItem: async (listId: string, name: string, quantity = 1, unit = 'pcs' as Item['unit'], category = 'Uncategorized') => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/items`, {
                method: 'POST',
                body: JSON.stringify({ name, quantity, unit, category }),
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('Item added successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to add item';
              toast.error(message);
              throw err;
            }
          },

          toggleItem: async (listId: string, itemId: string, currentIsBought: boolean) => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/items/${itemId}/toggle`, {
                method: 'PATCH',
                body: JSON.stringify({ isBought: !currentIsBought }),
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
            } catch (err: any) {
              const message = err.message || 'Failed to toggle item';
              toast.error(message);
              throw err;
            }
          },

          deleteItem: async (listId: string, itemId: string) => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/items/${itemId}`, {
                method: 'DELETE',
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('Item deleted successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to delete item';
              toast.error(message);
              throw err;
            }
          },

          removeDuplicates: async (listId: string) => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/remove-duplicates`, {
                method: 'POST',
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('Duplicates removed successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to remove duplicates';
              toast.error(message);
              throw err;
            }
          },

          inviteUserToListAPI: async (listId: string, email: string, role: 'viewer' | 'editor') => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/invite`, {
                method: 'POST',
                body: JSON.stringify({ email, role }),
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('Invitation sent successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to send invitation';
              toast.error(message);
              throw err;
            }
          },

          removeUserFromListAPI: async (listId: string, userId: string) => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/shared/${userId}`, {
                method: 'DELETE',
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('User removed successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to remove user';
              toast.error(message);
              throw err;
            }
          },

          changeRoleAPI: async (listId: string, userId: string, newRole: 'viewer' | 'editor') => {
            try {
              const updatedList = await api<List>(`/lists/${listId}/shared/${userId}/role`, {
                method: 'PATCH',
                body: JSON.stringify({ role: newRole }),
              });
              set(state => {
                if (state.currentList?._id === listId) {
                  state.currentList = updatedList;
                }
                const listIndex = state.lists.findIndex(l => l._id === listId);
                if (listIndex > -1) state.lists[listIndex] = updatedList;
              });
              toast.success('Role updated successfully!');
            } catch (err: any) {
              const message = err.message || 'Failed to change role';
              toast.error(message);
              throw err;
            }
          },

          acceptInvitationAPI: async (listId: string) => {
            try {
              await api(`/invitations/${listId}/accept`, { method: 'POST' });
              set(state => {
                state.invitations = state.invitations.filter(i => i.listId !== listId);
              });
              await get().fetchLists();
              toast.success('Invitation accepted!');
            } catch (err: any) {
              const message = err.message || 'Failed to accept invitation';
              toast.error(message);
              throw err;
            }
          },

          declineInvitationAPI: async (listId: string) => {
            try {
              await api(`/invitations/${listId}/decline`, { method: 'POST' });
              set(state => {
                state.invitations = state.invitations.filter(i => i.listId !== listId);
              });
              toast.success('Invitation declined!');
            } catch (err: any) {
              const message = err.message || 'Failed to decline invitation';
              toast.error(message);
              throw err;
            }
          },

          initializeSocket: (userId: string) => {
            const socket = io(import.meta.env.VITE_API_URL, {
              auth: { userId },
              withCredentials: true,
            });

            const socketListeners = {
              connect: () => {
                console.log('Socket connected successfully');
              },
              connect_error: (err: Error) => {
                console.error('Socket connection error:', err.message);
              },
              disconnect: () => {
                console.log('Socket disconnected');
              },
              listUpdated: (data: List) => {
                set(state => {
                  if (state.currentList?._id === data._id) {
                    state.currentList = data;
                  }
                  const listIndex = state.lists.findIndex(l => l._id === data._id);
                  if (listIndex > -1) state.lists[listIndex] = data;
                  else state.lists.push(data);
                });
              },
              invitationReceived: (data: Invitation) => {
                set(state => {
                  state.invitations.push(data);
                });
                toast.success(`New invitation to join "${data.listName}"`);
              },
              itemAdded: (data: { listId: string; item: Item }) => {
                set(state => {
                  if (state.currentList?._id === data.listId) {
                    state.currentList.items.push(data.item);
                  }
                  const listIndex = state.lists.findIndex(l => l._id === data.listId);
                  if (listIndex > -1) state.lists[listIndex].items.push(data.item);
                });
              },
              itemToggled: (data: { listId: string; itemId: string; isBought: boolean }) => {
                set(state => {
                  if (state.currentList?._id === data.listId) {
                    const item = state.currentList.items.find(i => i._id === data.itemId);
                    if (item) item.isBought = data.isBought;
                  }
                  const listIndex = state.lists.findIndex(l => l._id === data.listId);
                  if (listIndex > -1) {
                    const item = state.lists[listIndex].items.find(i => i._id === data.itemId);
                    if (item) item.isBought = data.isBought;
                  }
                });
              },
              itemDeleted: (data: { listId: string; itemId: string }) => {
                set(state => {
                  if (state.currentList?._id === data.listId) {
                    state.currentList.items = state.currentList.items.filter(i => i._id !== data.itemId);
                  }
                  const listIndex = state.lists.findIndex(l => l._id === data.listId);
                  if (listIndex > -1) {
                    state.lists[listIndex].items = state.lists[listIndex].items.filter(i => i._id !== data.itemId);
                  }
                });
              },
            };

            Object.entries(socketListeners).forEach(([event, handler]) => {
              socket.on(event, handler as (...args: any[]) => void);
            });

            set(state => {
              state.socket = socket;
            });
          },

          disconnectSocket: () => {
            const { socket } = get();
            if (socket) {
              socket.disconnect();
              set(state => {
                state.socket = null;
              });
            }
          },
        })
      )
    )
  )
);