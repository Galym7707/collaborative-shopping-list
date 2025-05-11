// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listStore.ts
import { create, StoreApi } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer, Draft } from 'zustand/middleware/immer';
import { api } from '../api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { UserInfo, Item, List, Invitation, SharedWithEntry } from './listTypes';
import { InboxArrowDownIcon } from '@heroicons/react/24/outline';
import React from 'react'; // Импорт React для JSX в toast

type ListSet = (fn: (draft: Draft<ListState>) => void | ListState) => void;
type ListGet = () => ListState;

interface ListState {
    lists: List[];
    currentList: List | null;
    invitations: Invitation[];
    isLoadingLists: boolean;
    isLoadingCurrentList: boolean;
    error: string | null;
    socket: Socket | null;
    isConnected: boolean;

    setLists: (lists: List[]) => void;
    fetchLists: () => Promise<void>;
    createList: (name: string) => Promise<List | undefined>;
    fetchListById: (id: string) => Promise<void>;
    setCurrentList: (list: List | null) => void;
    clearCurrentList: () => void;

    addItemAPI: (listId: string, payload: Partial<Omit<Item, '_id' | 'isBought' | 'boughtBy'>> & { name: string }) => Promise<void>;
    toggleItemAPI: (listId: string, itemId: string, currentIsBought: boolean) => Promise<void>;
    removeItemAPI: (listId: string, itemId: string) => Promise<void>;
    deleteListAPI: (listId: string) => Promise<boolean>;

    connectSocket: (token: string | null) => void;
    disconnectSocket: () => void;
    joinListRoom: (listId: string) => void;
    leaveListRoom: (listId: string) => void;

    removeDuplicatesAPI: (listId: string) => Promise<void>;
    inviteUserToListAPI: (listId: string, email: string, role: 'viewer' | 'editor') => Promise<void>;
    removeUserFromListAPI: (listId: string, userIdToRemove: string) => Promise<void>;

    acceptInviteAPI: (listId: string, userId: string) => Promise<void>;
    declineInviteAPI: (listId: string, userId: string) => Promise<void>;
    fetchInvitationsAPI: () => Promise<void>;

    handleListUpdate: (updatedList: List) => void;
    handleItemAdded: (data: { listId: string; item: Item }) => void;
    handleItemUpdated: (data: { listId: string; item: Item }) => void;
    handleItemDeleted: (data: { listId: string; itemId: string }) => void;
    handleListDeleted: (data: { listId: string }) => void;
    handleInvitation: (invitation: Invitation) => void;
    handleListShared: (sharedList: List) => void;
    handleListAccessRemoved: (data: { listId: string }) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL as string;
const SOCKET_URL = API_BASE_URL ? API_BASE_URL.replace('/api', '') : '';

if (!API_BASE_URL) { console.error("[ListStore] VITE_API_URL is not defined!"); }

export const useListStore = create<ListState>()(
    devtools(
        subscribeWithSelector(
            immer(
                (set: ListSet, get: ListGet): ListState => ({
                    lists: [], currentList: null, invitations: [],
                    isLoadingLists: false, isLoadingCurrentList: false,
                    error: null, socket: null, isConnected: false,

                    setLists: (lists) => set(state => { state.lists = lists; }),
                    setCurrentList: (list) => set(state => { state.currentList = list; }),
                    clearCurrentList: () => set(state => { state.currentList = null; }),

                    fetchLists: async () => {
                        set(state => { state.isLoadingLists = true; state.error = null; });
                        try {
                            const fetchedLists = await api<List[]>('/lists');
                            set(state => { state.lists = fetchedLists || []; state.isLoadingLists = false; });
                        } catch (err: any) {
                            const message = err.data?.message || err.message || 'Failed to fetch lists';
                            set(state => { state.error = message; state.isLoadingLists = false; });
                            toast.error(message);
                        }
                    },
                    fetchListById: async (id) => {
                        const currentListFromGet = get().currentList;
                        if (currentListFromGet?._id === id && currentListFromGet?.items) {
                            get().joinListRoom(id);
                            if (get().isLoadingCurrentList) set(state => { state.isLoadingCurrentList = false; });
                            return;
                        }
                        set(state => { state.isLoadingCurrentList = true; state.currentList = null; state.error = null; });
                        try {
                            const list = await api<List>(`/lists/${id}`);
                            if (list) {
                                set(state => { state.currentList = list; state.isLoadingCurrentList = false; });
                                get().joinListRoom(id);
                            } else { throw new Error("List not found from API"); }
                        } catch (err: any) {
                            const message = err.data?.message || err.message || `Failed to fetch list ${id}`;
                            set(state => { state.error = message; state.isLoadingCurrentList = false; state.currentList = null; });
                            toast.error(message);
                        }
                    },
                    createList: async (name): Promise<List | undefined> => {
                        set(state => { state.isLoadingLists = true; });
                        let newListFromApi: List | undefined = undefined;
                        try {
                            newListFromApi = await api<List>('/lists', { method: 'POST', body: JSON.stringify({ name }) });
                            if (newListFromApi) {
                                set(state => { state.lists.push(newListFromApi!); state.isLoadingLists = false; });
                            } else { throw new Error('API returned no list data after creation'); }
                        } catch (err: any) {
                            const message = err.data?.message || err.message || 'Failed to create list';
                            set(state => { state.error = message; state.isLoadingLists = false; });
                            toast.error(message);
                            newListFromApi = undefined;
                        }
                        return newListFromApi;
                    },
                    addItemAPI: async (listId, payload) => {
                        try {
                            const addedItem = await api<Item>(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(payload) });
                            if (addedItem) {
                                set(state => {
                                    if (state.currentList?._id === listId && !state.currentList.items.some(i => i._id === addedItem._id)) {
                                        state.currentList.items.push(addedItem);
                                    }
                                });
                            }
                        } catch (err: any) { const message = err.data?.message || err.message || 'Failed to add item'; toast.error(message); }
                    },
                    toggleItemAPI: async (listId, itemId, currentIsBought) => {
                        try {
                            const updatedItem = await api<Item>(`/lists/${listId}/items/${itemId}`, {
                                method: 'PATCH', body: JSON.stringify({ isBought: !currentIsBought }),
                            });
                            if (updatedItem) {
                                set(state => {
                                    if (state.currentList?._id === listId) {
                                        const itemIndex = state.currentList.items.findIndex(i => i._id === itemId);
                                        if (itemIndex > -1) state.currentList.items[itemIndex] = updatedItem;
                                    }
                                });
                            }
                        } catch (err: any) { const message = err.data?.message || err.message || 'Failed to toggle item'; toast.error(message); }
                    },
                    removeItemAPI: async (listId, itemId) => {
                        const currentList = get().currentList;
                        const itemToRemove = currentList?.items.find(i => i._id === itemId);
                        const originalItems = currentList ? [...currentList.items] : [];
                        set(state => { if (state.currentList?._id === listId) state.currentList.items = state.currentList.items.filter(i => i._id !== itemId);});
                        try {
                            await api(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' });
                            if (itemToRemove) toast.success(`Item "${itemToRemove.name}" removed`); else toast.success('Item removed');
                        } catch (err: any) {
                            const message = err.data?.message || err.message || 'Failed to remove item'; toast.error(message);
                            set(state => { if (state.currentList?._id === listId) state.currentList.items = originalItems; });
                        }
                    },
                    deleteListAPI: async (listId) => {
                        set(state => { state.isLoadingLists = true; });
                        try {
                            await api(`/lists/${listId}`, { method: 'DELETE' });
                            set(state => {
                                state.lists = state.lists.filter(l => l._id !== listId);
                                if (state.currentList?._id === listId) state.currentList = null;
                                state.isLoadingLists = false;
                            });
                            toast.success('List deleted successfully');
                            return true;
                        } catch (err: any) {
                            const message = err.data?.message || err.message || 'Failed to delete list';
                            set(state => { state.error = message; state.isLoadingLists = false; }); toast.error(message); return false;
                        }
                    },
                    removeDuplicatesAPI: async (listId) => {
                        set(state => ({ isLoadingCurrentList: state.currentList?._id === listId, isLoadingLists: state.currentList?._id !== listId }));
                        try {
                            const result = await api<{ message: string, list: List }>(`/lists/${listId}/remove-duplicates`, { method: 'POST' });
                            if (result.list) {
                                set(state => ({
                                    lists: state.lists.map(l => l._id === listId ? result.list : l),
                                    currentList: state.currentList?._id === listId ? result.list : state.currentList,
                                }));
                                toast.success(result.message || "Duplicates removed");
                            } else { toast(result.message || "No duplicates found.", { icon: 'ℹ️' }); }
                        } catch (err: any) { const message = err.data?.message || err.message || 'Failed to remove duplicates'; toast.error(message); }
                        finally { set(state => { state.isLoadingLists = false; state.isLoadingCurrentList = false; }); }
                    },
                    inviteUserToListAPI: async (listId, email, role) => {
                        try {
                            const result = await api<{ message: string, list: List }>(`/lists/${listId}/share`, {
                                method: 'POST', body: JSON.stringify({ email, role }),
                            });
                            if (result.list) {
                                set(state => {
                                    const listIndex = state.lists.findIndex(l => l._id === listId);
                                    if(listIndex > -1) state.lists[listIndex] = result.list;
                                    if (state.currentList?._id === listId) state.currentList = result.list;
                                });
                                toast.success(result.message || `Invitation sent to ${email}`);
                            }
                        } catch (err: any) { const message = err.data?.message || err.message || 'Failed to invite user'; toast.error(message); }
                    },
                    removeUserFromListAPI: async (listId, userIdToRemove) => {
                         try {
                            const result = await api<{ message: string, list: List }>(`/lists/${listId}/share/${userIdToRemove}`, { method: 'DELETE' });
                            if (result.list) {
                                set(state => {
                                    const listIndex = state.lists.findIndex(l => l._id === listId);
                                    if(listIndex > -1) state.lists[listIndex] = result.list;
                                    if (state.currentList?._id === listId) state.currentList = result.list;
                                });
                                toast.success(result.message || `User access removed`);
                            }
                         } catch (err: any) { const message = err.data?.message || err.message || 'Failed to remove access'; toast.error(message); }
                     },
                    acceptInviteAPI: async (listId, currentUserId) => {
                        try {
                            await api(`/lists/${listId}/invite/${currentUserId}/accept`, { method: 'PUT' });
                            toast.success('Invitation accepted!');
                            await get().fetchLists();
                            await get().fetchInvitationsAPI();
                        } catch (e:any) { toast.error(e.message || 'Failed to accept invite'); }
                    },
                    declineInviteAPI: async (listId, currentUserId) => {
                        try {
                            await api(`/lists/${listId}/invite/${currentUserId}/decline`, { method: 'PUT' });
                            toast.info('Invitation declined.'); // Используем info вместо error для decline
                            await get().fetchInvitationsAPI();
                        } catch (e:any) { toast.error(e.message || 'Failed to decline invite'); }
                    },
                    fetchInvitationsAPI: async () => {
                        try {
                            const listsWithPendingInvites = await api<List[]>(`/lists/invitations`);
                            const currentUserId = get().socket?.data?.user?.id || (localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!)._id : undefined);
                            const mappedInvites: Invitation[] = listsWithPendingInvites
                                .filter(list => list.sharedWith.some(sw => sw.user._id === currentUserId && sw.status === 'pending')) // Доп. фильтрация на фронте
                                .map(list => {
                                    const selfInShared = list.sharedWith.find(sw => sw.user._id === currentUserId && sw.status === 'pending');
                                    return {
                                        listId: list._id,
                                        listName: list.name,
                                        inviterUsername: list.owner.username,
                                        inviterEmail: list.owner.email,
                                        role: selfInShared?.role,
                                    };
                                });
                            set(state => { state.invitations = mappedInvites; });
                        } catch (e:any) { console.error('Fetch invitations error', e); toast.error(e.message || 'Failed to fetch invitations'); }
                    },
                    connectSocket: (token) => {
                        if (get().socket || !token || !SOCKET_URL) return;
                        const newSocket: Socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
                        set(state => { state.socket = newSocket; });
                        newSocket.on('connect', () => { set(state => { state.isConnected = true; state.error = null; }); const cl = get().currentList; if(cl?._id) get().joinListRoom(cl._id); const user = (newSocket as any).handshake?.auth?.user || get().socket?.data?.user; if (user?.id) newSocket.emit('joinUserRoom', `user_${user.id}`); });
                        newSocket.on('disconnect', (reason) => { set(state => { state.isConnected = false; state.socket = null; if (reason !== 'io client disconnect') state.error='Disconnected';}); });
                        newSocket.on('connect_error', (err) => { const msg = (err as any).message; if (msg === 'jwt_expired' || msg === 'unauthorized_invalid_token' || msg === 'unauthorized_no_token' ) { localStorage.removeItem('authToken'); localStorage.removeItem('authUser'); set(state => {state.socket=null; state.isConnected=false; state.error=`Auth err: ${msg}`}); if (typeof window !== 'undefined') window.location.href = '/login?sessionExpired=1&reason=ws_auth'; } else { set(state => {state.isConnected=false; state.socket=null; state.error=`Conn failed: ${msg}`}); toast.error(`Socket Err: ${msg}`); } });
                        newSocket.on('listUpdate', get().handleListUpdate);
                        newSocket.on('itemAdded', get().handleItemAdded);
                        newSocket.on('itemToggled', get().handleItemUpdated);
                        newSocket.on('itemDeleted', get().handleItemDeleted);
                        newSocket.on('listCreated', get().handleListUpdate);
                        newSocket.on('listDeleted', get().handleListDeleted);
                        newSocket.on('invitePending', get().handleInvitation);
                        newSocket.on('listSharedWithYou', get().handleListShared);
                        newSocket.on('listAccessRemoved', get().handleListAccessRemoved);
                     },
                    disconnectSocket: () => { get().socket?.disconnect(); },
                    joinListRoom: (listId) => { if (get().isConnected && get().socket && listId) get().socket?.emit('joinList', listId); },
                    leaveListRoom: (listId) => { if (get().isConnected && get().socket && listId) get().socket?.emit('leaveList', listId); },

                    handleListUpdate: (updatedList) => { set(state => { const idx = state.lists.findIndex(l => l._id === updatedList._id); if(idx > -1) state.lists[idx] = updatedList; else state.lists.push(updatedList); if(state.currentList?._id === updatedList._id) state.currentList = updatedList; }); },
                    handleItemAdded: (data) => { set(state => { if (state.currentList?._id === data.listId && !state.currentList.items.some(i => i._id === data.item._id)) state.currentList.items.push(data.item); }); },
                    handleItemUpdated: (data) => { set(state => { if (state.currentList?._id === data.listId) { const idx = state.currentList.items.findIndex(i => i._id === data.item._id); if (idx > -1) state.currentList.items[idx] = data.item; } }); },
                    handleItemDeleted: (data) => { set(state => { if (state.currentList?._id === data.listId) state.currentList.items = state.currentList.items.filter(i => i._id !== data.itemId); }); },
                    handleListDeleted: (data) => { set(state => { state.lists = state.lists.filter(l => l._id !== data.listId); if (state.currentList?._id === data.listId) { state.currentList = null; toast.info("The list you were viewing was deleted."); } }); },
                    handleInvitation: (invitation: Invitation) => {
                      set(state => {
                          if (!state.invitations.find(i => i.listId === invitation.listId)) {
                              state.invitations.push(invitation);
                              // --- УПРОЩЕННЫЙ TOAST ---
                              const message = `You've been invited to "${invitation.listName}" by ${invitation.inviterUsername}`;
                              toast(message, {
                                  icon: "📥",
                                  duration: 6000
                              });
                              // -------------------------
                          }
                      });
                  },
                    handleListShared: (sharedList) => { set(state => { const idx = state.lists.findIndex(l => l._id === sharedList._id); if(idx > -1) state.lists[idx] = sharedList; else state.lists.push(sharedList); if(state.currentList?._id === sharedList._id) state.currentList = sharedList; }); toast.info(`List "${sharedList.name}" is now shared with you.`); },
                    handleListAccessRemoved: (data) => { set(state => { state.lists = state.lists.filter(l => l._id !== data.listId); if (state.currentList?._id === data.listId) state.currentList = null; }); toast.warn(`Your access to a list was removed.`); },
                })
            )
        )
    )
);