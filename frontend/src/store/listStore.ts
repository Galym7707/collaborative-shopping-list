// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { api } from '../api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { UserInfo, Item, List, Invitation } from './listTypes'; // Убедись, что этот файл и типы существуют
// import { InboxArrowDownIcon } from '@heroicons/react/24/outline'; // Для toast (убираем, не используется)

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

    addItemAPI: (listId: string, payload: Partial<Item> & { name: string }) => Promise<void>;
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

    // Для заглушек из listRoutes (или реальных вызовов, если они реализованы на бэке)
    acceptInviteAPI: (listId: string, inviterId: string) => Promise<void>; // inviterId или invitationId
    declineInviteAPI: (listId: string, inviterId: string) => Promise<void>; // inviterId или invitationId
    fetchInvitationsAPI: () => Promise<void>;

    // WS Handlers
    handleListUpdate: (updatedList: List) => void;
    handleItemAdded: (data: { listId: string; item: Item }) => void;
    handleItemUpdated: (data: { listId: string; item: Item }) => void;
    handleItemDeleted: (data: { listId: string; itemId: string }) => void;
    handleListDeleted: (data: { listId: string }) => void;
    handleInvitation: (invitation: Invitation) => void;
    handleListShared: (sharedList: List) => void;
    handleListAccessRemoved: (data: { listId: string }) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL as string | undefined;
const SOCKET_URL = API_BASE_URL ? API_BASE_URL.replace('/api', '') : '';

if (!API_BASE_URL) {
    console.error("[ListStore] VITE_API_URL is not defined!");
}
if (!SOCKET_URL && API_BASE_URL) {
    console.error("[ListStore] SOCKET_URL could not be derived from VITE_API_URL!");
}

export const useListStore = create(
    devtools(
        subscribeWithSelector(
            immer((set: any, get: any) => ({
                lists: [], currentList: null, invitations: [],
                isLoadingLists: false, isLoadingCurrentList: false,
                error: null, socket: null, isConnected: false,

                setLists: (lists: List[]) => set({ lists }),
                setCurrentList: (list: List | null) => set({ currentList: list }),
                clearCurrentList: () => set({ currentList: null }),

                fetchLists: async (): Promise<void> => {
                    console.log('[ListStore] fetchLists called');
                    set({ isLoadingLists: true, error: null });
                    try {
                        const fetchedLists = await api<List[]>('/lists');
                        console.log('[ListStore] fetchLists success, count:', fetchedLists?.length);
                        set({ lists: fetchedLists || [], isLoadingLists: false });
                    } catch (err: any) {
                        const message = (err as any).data?.message || (err as any).message || 'Failed to fetch lists';
                        console.error('[ListStore] fetchLists error:', message, err);
                        set({ error: message, isLoadingLists: false });
                        toast.error(message);
                    }
                },
                fetchListById: async (id: string): Promise<void> => {
                    console.log(`[ListStore] fetchListById called for ID: ${id}`);
                    if (get().currentList?._id === id && get().currentList?.items) {
                        console.log(`List ${id} already current, ensuring room join.`);
                        get().joinListRoom(id);
                        if (get().isLoadingCurrentList) set({ isLoadingCurrentList: false });
                        return;
                    }
                    set({ isLoadingCurrentList: true, currentList: null, error: null });
                    try {
                        const list = await api<List>(`/lists/${id}`);
                        console.log(`[ListStore] fetchListById success for ID: ${id}`, list ? 'Data OK' : 'No data');
                        if (list) {
                            set({ currentList: list, isLoadingCurrentList: false });
                            get().joinListRoom(id);
                        } else {
                            throw new Error("List not found from API");
                        }
                    } catch (err: any) {
                        const message = (err as any).data?.message || (err as any).message || `Failed to fetch list ${id}`;
                        console.error(`[ListStore] fetchListById error for ID: ${id}:`, message, err);
                        set({ error: message, isLoadingCurrentList: false, currentList: null });
                        toast.error(message);
                    }
                },
                createList: async (name: string): Promise<List | undefined> => {
                    console.log(`[ListStore] createList called with name: "${name}"`);
                    set({ isLoadingLists: true });
                    let newListFromApi: List | undefined = undefined;
                    try {
                        newListFromApi = await api<List>('/lists', { method: 'POST', body: JSON.stringify({ name }) });
                        if (newListFromApi) {
                            set((state: any) => { state.lists.push(newListFromApi!); state.isLoadingLists = false; });
                        } else { throw new Error('API returned no list data after creation'); }
                    } catch (err: any) {
                        const message = (err as any).data?.message || (err as any).message || 'Failed to create list';
                        console.error('[ListStore] createList: Error caught:', message, err);
                        set({ error: message, isLoadingLists: false });
                        toast.error(message);
                        newListFromApi = undefined;
                    }
                    return newListFromApi;
                },
                addItemAPI: async (listId: string, payload: Partial<Item> & { name: string }): Promise<void> => {
                    console.log(`[ListStore] addItemAPI for list ${listId}, payload:`, payload);
                    try {
                        const addedItem = await api<Item>(`/lists/${listId}/items`, { method: 'POST', body: JSON.stringify(payload) });
                        if (addedItem) {
                            set((state: any) => {
                                if (state.currentList?._id === listId && !state.currentList.items.some((i: Item) => i._id === addedItem._id)) {
                                    state.currentList.items.push(addedItem);
                                }
                            });
                        }
                    } catch (err: any) { const message = (err as any).data?.message || (err as any).message || 'Failed to add item'; toast.error(message); }
                },
                toggleItemAPI: async (listId: string, itemId: string, currentIsBought: boolean): Promise<void> => {
                    console.log(`[ListStore] toggleItemAPI for list ${listId}, item ${itemId}, currentIsBought: ${currentIsBought}`);
                    try {
                        const updatedItem = await api<Item>(`/lists/${listId}/items/${itemId}`, {
                            method: 'PATCH', body: JSON.stringify({ isBought: !currentIsBought }),
                        });
                        if (updatedItem) {
                            set((state: any) => {
                                if (state.currentList?._id === listId) {
                                    const itemIndex = state.currentList.items.findIndex((i: Item) => i._id === itemId);
                                    if (itemIndex > -1) state.currentList.items[itemIndex] = updatedItem;
                                }
                            });
                        }
                    } catch (err: any) { const message = (err as any).data?.message || (err as any).message || 'Failed to toggle item'; toast.error(message); }
                },
                removeItemAPI: async (listId: string, itemId: string): Promise<void> => {
                    console.log(`[ListStore] removeItemAPI for list ${listId}, item ${itemId}`);
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
                deleteListAPI: async (listId: string): Promise<boolean> => {
                    console.log(`[ListStore] deleteListAPI for ID: ${listId}`);
                    set({ isLoadingLists: true });
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
                        set({ error: message, isLoadingLists: false }); toast.error(message); return false;
                    }
                },
                removeDuplicatesAPI: async (listId: string): Promise<void> => {
                    console.log(`[ListStore] removeDuplicatesAPI for ID: ${listId}`);
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
                    finally { set({ isLoadingLists: false, isLoadingCurrentList: false }); }
                },
                inviteUserToListAPI: async (listId: string, email: string, role: 'viewer' | 'editor'): Promise<void> => {
                    console.log(`[ListStore] inviteUserToListAPI for list ${listId}, email: ${email}, role: ${role}`);
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
                removeUserFromListAPI: async (listId: string, userIdToRemove: string): Promise<void> => {
                    console.log(`[ListStore] removeUserFromListAPI for list ${listId}, user: ${userIdToRemove}`);
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
                acceptInviteAPI: async (listId: string, inviterId: string): Promise<void> => {
                    console.log(`[ListStore] acceptInviteAPI for list ${listId}, inviter/invite ID: ${inviterId}`);
                    try {
                        // На бэкенде /:userId в роуте respondToInvite это ID ТЕКУЩЕГО пользователя
                        // const currentUserId = get().socket?.data?.user?.id; // Предполагая, что user ID есть в socket.data
                        const currentUserId = localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!)._id : undefined;
                        if (!currentUserId) { toast.error("User not identified for accepting invite."); return;}
                        await api(`/lists/${listId}/invite/${currentUserId}/accept`, { method: 'PUT' });
                        toast.success('Invitation accepted!');
                        get().fetchLists();
                        get().fetchInvitationsAPI();
                    } catch (e:any) { toast.error(e.message || 'Failed to accept invite'); }
                },
                declineInviteAPI: async (listId: string, inviterId: string): Promise<void> => {
                    console.log(`[ListStore] declineInviteAPI for list ${listId}, inviter/invite ID: ${inviterId}`);
                    try {
                        // const currentUserId = get().socket?.data?.user?.id;
                        const currentUserId = localStorage.getItem('authUser') ? JSON.parse(localStorage.getItem('authUser')!)._id : undefined;
                        if (!currentUserId) { toast.error("User not identified for declining invite."); return;}
                        await api(`/lists/${listId}/invite/${currentUserId}/decline`, { method: 'PUT' });
                        toast('Invitation declined.', { icon: 'ℹ️' });
                        get().fetchInvitationsAPI();
                    } catch (e:any) { toast.error(e.message || 'Failed to decline invite'); }
                },
                fetchInvitationsAPI: async (): Promise<void> => {
                    console.log('[ListStore] fetchInvitationsAPI called');
                    try {
                        const listsWithPendingInvites = await api<List[]>(`/lists/invitations`);
                        const mappedInvites: Invitation[] = listsWithPendingInvites.map(list => ({
                            listId: list._id,
                            listName: list.name,
                            inviterUsername: list.owner.username,
                            inviterEmail: list.owner.email,
                            // role: найти роль из list.sharedWith для текущего юзера, если она там есть
                        }));
                        set({ invitations: mappedInvites });
                    } catch (e:any) { console.error('Fetch invitations error', e); toast.error(e.message || 'Failed to fetch invitations'); }
                },

                // --- WebSocket ---
                connectSocket: (token: string | null) => {
                    if (get().socket || !token || !SOCKET_URL) {
                        console.warn("[ListStore] connectSocket: Socket already exists or no token/URL.");
                        return;
                    }
                    console.log(`[ListStore] connectSocket. Connecting to ${SOCKET_URL}`);
                    const newSocket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
                    set({ socket: newSocket }); // Сохраняем сокет сразу
                    newSocket.on('connect', () => {
                         console.log('[ListStore] WS Connected:', newSocket.id);
                         set({ isConnected: true, error: null });
                         const currentListId = get().currentList?._id;
                         if (currentListId) get().joinListRoom(currentListId);
                         // Бэкенд автоматически добавит в комнату user_id
                    });
                    newSocket.on('disconnect', (reason) => {
                        console.log('[ListStore] WS Disconnected:', reason);
                        if (reason === 'io server disconnect') { // Сервер принудительно закрыл соединение
                            set({ isConnected: false, socket: null, error: 'Disconnected by server.' });
                            toast.error('Disconnected by server.');
                        } else if (reason !== 'io client disconnect') { // Проблемы с сетью и т.д.
                            set({ isConnected: false, socket: null, error: 'Connection lost. Reconnecting...' });
                            toast.error('Connection lost. Reconnecting...');
                        } else { // Ручной дисконнект
                            set({ isConnected: false, socket: null, error: null });
                        }
                    });
                    newSocket.on('connect_error', (err) => {
                        console.error('[ListStore] WS Connection Error:', err);
                        const message = err.message;
                        if (message === 'jwt_expired' || message === 'unauthorized_invalid_token' || message === 'unauthorized_no_token' ) {
                            console.warn("[ListStore] WS Auth Error, redirecting to login:", message);
                            localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                            set({ socket: null, isConnected: false, error: `Auth error: ${message}` }); // Обновляем состояние
                            if (typeof window !== 'undefined') window.location.href = '/login?sessionExpired=1&reason=ws_auth';
                        } else {
                            set({ isConnected: false, socket: null, error: `Connection failed: ${message}` });
                            toast.error(`Socket Connection Error: ${message}`);
                        }
                    });
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
                disconnectSocket: () => { console.log('[ListStore] disconnectSocket called.'); get().socket?.disconnect(); },
                joinListRoom: (listId: string) => { if (get().isConnected && get().socket && listId) get().socket?.emit('joinList', listId); else console.warn(`[ListStore] Cannot join room ${listId}. Socket connected: ${get().isConnected}`); },
                leaveListRoom: (listId: string) => { if (get().isConnected && get().socket && listId) get().socket?.emit('leaveList', listId); },

                // --- WS Handlers ---
                handleListUpdate: (updatedList: List) => { /* ... */ },
                handleItemAdded: (data: { listId: string; item: Item }) => { set((state: any) => { if (state.currentList?._id === data.listId && !(state.currentList.items as any[]).some((i: any) => i._id === data.item._id)) state.currentList.items.push(data.item); }); },
                handleItemUpdated: (data: { listId: string; item: Item }) => { set((state: any) => { if (state.currentList?._id === data.listId) { const idx = (state.currentList.items as any[]).findIndex((i: any) => i._id === data.item._id); if (idx > -1) state.currentList.items[idx] = data.item; } }); },
                handleItemDeleted: (data: { listId: string; itemId: string }) => { set((state: any) => { if (state.currentList?._id === data.listId) state.currentList.items = (state.currentList.items as any[]).filter((i: any) => i._id !== data.itemId); }); },
                handleListDeleted: (data: { listId: string }) => { set((state: any) => { state.lists = (state.lists as any[]).filter((l: any) => l._id !== data.listId); if (state.currentList?._id === data.listId) { state.currentList = null; toast('The list you were viewing was deleted.', { icon: '⚠️' }); } }); },
                handleInvitation: (invitation: Invitation) => {
                    set((state: any) => {
                        if (!(state.invitations as any[]).find((i: any) => i.listId === invitation.listId)) {
                            state.invitations.push(invitation);
                            toast(`You've been invited to "${invitation.listName}" by ${invitation.inviterUsername}`, { icon: "📥" });
                        }
                    });
                },
                handleListShared: (sharedList: List) => { set((state: any) => { const idx = (state.lists as any[]).findIndex((l: any) => l._id === sharedList._id); if(idx > -1) state.lists[idx] = sharedList; else state.lists.push(sharedList); if(state.currentList?._id === sharedList._id) state.currentList = sharedList; }); toast(`List "${sharedList.name}" is now shared with you.`, { icon: 'ℹ️' }); },
                handleListAccessRemoved: (data: { listId: string }) => { set((state: any) => { state.lists = (state.lists as any[]).filter((l: any) => l._id !== data.listId); if (state.currentList?._id === data.listId) state.currentList = null; }); toast('Your access to a list was removed.', { icon: '⚠️' }); },
            }))
        )
    )
) as unknown as (set: any, get: any) => ListState;