// File: C:\Users\galym\Desktop\ShopSmart\frontend\src\store\listStore.ts
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { api } from '../api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { UserInfo, Item, List, Invitation } from './listTypes'; // Импорт типов

interface ListState {
    lists: List[];
    currentList: List | null;
    invitations: Invitation[]; // Добавили для примера
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
    toggleItemAPI: (listId: string, itemId: string, currentIsBought: boolean) => Promise<void>; // Передаем текущее состояние
    removeItemAPI: (listId: string, itemId: string) => Promise<void>;
    deleteListAPI: (listId: string) => Promise<boolean>;

    connectSocket: (token: string | null) => void;
    disconnectSocket: () => void;
    joinListRoom: (listId: string) => void;
    leaveListRoom: (listId: string) => void;

    removeDuplicatesAPI: (listId: string) => Promise<void>;
    inviteUserToListAPI: (listId: string, email: string, role: 'viewer' | 'editor') => Promise<void>; // Добавили role
    removeUserFromListAPI: (listId: string, userIdToRemove: string) => Promise<void>;
    // Для заглушек из listRoutes
    acceptInviteAPI: (listId: string, userId: string) => Promise<void>;
    declineInviteAPI: (listId: string, userId: string) => Promise<void>;
    fetchInvitationsAPI: () => Promise<void>;


    // WS Handlers
    handleListUpdate: (updatedList: List) => void;
    handleItemAdded: (data: { listId: string; item: Item }) => void;
    handleItemUpdated: (data: { listId: string; item: Item }) => void;
    handleItemDeleted: (data: { listId: string; itemId: string }) => void;
    handleListDeleted: (data: { listId: string }) => void;
    handleInvitation: (invitation: Invitation) => void; // Для WS 'invitePending'
    handleListShared: (sharedList: List) => void;
    handleListAccessRemoved: (data: { listId: string }) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL; // Должен быть определен
const SOCKET_URL = API_BASE_URL ? API_BASE_URL.replace('/api', '') : '';

export const useListStore = create<ListState>()(
    devtools(
        subscribeWithSelector(
            immer(
                (set, get) => ({
                    lists: [], currentList: null, invitations: [],
                    isLoadingLists: false, isLoadingCurrentList: false,
                    error: null, socket: null, isConnected: false,

                    setLists: (lists) => set({ lists }),
                    setCurrentList: (list) => set({ currentList: list }),
                    clearCurrentList: () => set({ currentList: null }),

                    fetchLists: async () => { /* ... (код с логами) ... */ },
                    createList: async (name) => { /* ... (код с логами) ... */ },
                    fetchListById: async (id) => { /* ... (код с логами) ... */ },

                    addItemAPI: async (listId, payload) => {
                        console.log(`[ListStore] addItemAPI for list ${listId}, payload:`, payload);
                        try {
                            const addedItem = await api<Item>(`/lists/${listId}/items`, {
                                method: 'POST', body: JSON.stringify(payload),
                            });
                            if (addedItem) {
                                set(state => {
                                    if (state.currentList?._id === listId && !state.currentList.items.some(i => i._id === addedItem._id)) {
                                        state.currentList.items.push(addedItem);
                                    }
                                });
                                // Бэкенд эмитит itemAdded
                            }
                        } catch (err: any) { /* ... обработка ошибки ... */ }
                    },
                    toggleItemAPI: async (listId, itemId, currentIsBought) => {
                        console.log(`[ListStore] toggleItemAPI for list ${listId}, item ${itemId}, currentIsBought: ${currentIsBought}`);
                        try {
                            // Используем общий updateItem эндпоинт
                            const updatedItem = await api<Item>(`/lists/${listId}/items/${itemId}`, {
                                method: 'PATCH',
                                body: JSON.stringify({ isBought: !currentIsBought }),
                            });
                            if (updatedItem) {
                                set(state => {
                                    if (state.currentList?._id === listId) {
                                        const itemIndex = state.currentList.items.findIndex(i => i._id === itemId);
                                        if (itemIndex > -1) state.currentList.items[itemIndex] = updatedItem;
                                    }
                                });
                                 // Бэкенд эмитит itemUpdated
                            }
                        } catch (err: any) { /* ... обработка ошибки ... */ }
                    },
                    removeItemAPI: async (listId, itemId) => { /* ... (код с логами) ... */ },
                    deleteListAPI: async (listId) => { /* ... (код с логами) ... */ return true; /* или false */ },
                    removeDuplicatesAPI: async (listId) => { /* ... (код с логами) ... */ },

                    inviteUserToListAPI: async (listId, email, role) => { // Добавили role
                        console.log(`[ListStore] inviteUserToListAPI for list ${listId}, email: ${email}, role: ${role}`);
                        try {
                            const result = await api<{ message: string, list: List }>(`/lists/${listId}/share`, {
                                method: 'POST', body: JSON.stringify({ email, role }), // Передаем роль
                            });
                            if (result.list) {
                                set(state => {
                                    const listIndex = state.lists.findIndex(l => l._id === listId);
                                    if(listIndex > -1) state.lists[listIndex] = result.list;
                                    if (state.currentList?._id === listId) state.currentList = result.list;
                                });
                                toast.success(result.message || `Invitation sent to ${email}`);
                            }
                        } catch (err: any) { /* ... обработка ошибки ... */ }
                    },
                    removeUserFromListAPI: async (listId, userIdToRemove) => { /* ... (код с логами) ... */ },

                    // Заглушки для API вызовов к новым роутам
                    acceptInviteAPI: async (listId, userId) => {
                        console.log(`[ListStore] acceptInviteAPI for list ${listId}, user ${userId}`);
                        try {
                            await api(`/lists/${listId}/invite/${userId}/accept`, { method: 'PUT' });
                            toast.success('Invitation accepted!');
                            get().fetchLists(); // Обновляем списки
                            get().fetchInvitationsAPI(); // Обновляем приглашения
                        } catch (e:any) { toast.error(e.message || 'Failed to accept invite'); }
                    },
                    declineInviteAPI: async (listId, userId) => {
                         console.log(`[ListStore] declineInviteAPI for list ${listId}, user ${userId}`);
                        try {
                            await api(`/lists/${listId}/invite/${userId}/decline`, { method: 'PUT' });
                            toast.info('Invitation declined.');
                            get().fetchInvitationsAPI(); // Обновляем приглашения
                        } catch (e:any) { toast.error(e.message || 'Failed to decline invite'); }
                    },
                    fetchInvitationsAPI: async () => {
                        console.log('[ListStore] fetchInvitationsAPI called');
                        try {
                            const invites = await api<List[]>(`/lists/invitations`); // Предполагаем, что бэкенд вернет List[]
                            // Нужно адаптировать к реальному ответу бэкенда (если он Invitation[])
                            const mappedInvites: Invitation[] = invites.map(list => ({
                                listId: list._id,
                                listName: list.name,
                                inviterUsername: list.owner.username, // Предполагаем, что owner есть
                                inviterEmail: list.owner.email,
                            }));
                            set({ invitations: mappedInvites });
                        } catch (e:any) { console.error('Fetch invitations error', e); toast.error(e.message || 'Failed to fetch invitations'); }
                    },


                    // --- WebSocket ---
                    connectSocket: (token) => {
                        if (get().socket || !token || !SOCKET_URL) return;
                        console.log(`[ListStore] connectSocket. Connecting to ${SOCKET_URL}`);
                        const newSocket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
                        set({ socket: newSocket });
                        newSocket.on('connect', () => { /* ... */ });
                        newSocket.on('disconnect', (reason) => { /* ... */ });
                        newSocket.on('connect_error', (err) => {
                            if (err.message === 'jwt_expired' || err.message === 'unauthorized_invalid_token' || err.message === 'unauthorized_no_token' ) {
                                console.warn("[ListStore] WS Auth Error, redirecting to login:", err.message);
                                localStorage.removeItem('authToken'); localStorage.removeItem('authUser');
                                if (typeof window !== 'undefined') window.location.href = '/login?sessionExpired=1&reason=ws_auth';
                            } else { /* ... */ }
                        });
                        newSocket.on('listUpdate', get().handleListUpdate);
                        newSocket.on('itemAdded', get().handleItemAdded);
                        newSocket.on('itemToggled', get().handleItemUpdated); // Используем itemUpdated для itemToggled
                        newSocket.on('itemDeleted', get().handleItemDeleted);
                        newSocket.on('listCreated', get().handleListUpdate);
                        newSocket.on('listDeleted', get().handleListDeleted);
                        newSocket.on('invitePending', get().handleInvitation); // Для получения новых приглашений по WS
                        newSocket.on('listSharedWithYou', get().handleListShared);
                        newSocket.on('listAccessRemoved', get().handleListAccessRemoved);
                    },
                    disconnectSocket: () => { /* ... */ },
                    joinListRoom: (listId) => { /* ... */ },
                    leaveListRoom: (listId) => { /* ... */ },

                    // --- WS Handlers ---
                    handleListUpdate: (updatedList) => { /* ... */ },
                    handleItemAdded: (data) => { set(state => { if (state.currentList?._id === data.listId && !state.currentList.items.some(i => i._id === data.item._id)) state.currentList.items.push(data.item); }); },
                    handleItemUpdated: (data) => { set(state => { if (state.currentList?._id === data.listId) { const idx = state.currentList.items.findIndex(i => i._id === data.item._id); if (idx > -1) state.currentList.items[idx] = data.item; } }); },
                    handleItemDeleted: (data) => { set(state => { if (state.currentList?._id === data.listId) state.currentList.items = state.currentList.items.filter(i => i._id !== data.itemId); }); },
                    handleListDeleted: (data) => { /* ... */ },
                    handleInvitation: (invitation) => {
                        console.log("[WS] Received invitePending:", invitation);
                        set(state => {
                            if (!state.invitations.find(i => i.listId === invitation.listId)) {
                                state.invitations.push(invitation);
                                toast(`You've been invited to "${invitation.listName}" by ${invitation.inviterUsername}`, { icon: <InboxArrowDownIcon className="h-6 w-6 text-blue-500"/> });
                            }
                        });
                    },
                    handleListShared: (sharedList) => { /* ... */ },
                    handleListAccessRemoved: (data) => { /* ... */ },
                })
            )
        )
    )
);