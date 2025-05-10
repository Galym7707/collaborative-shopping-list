// File: frontend/src/store/listStore.ts
import { create }                     from 'zustand';
import { immer }                      from 'zustand/middleware/immer';
import { subscribeWithSelector }      from 'zustand/middleware';
import { io, Socket }                 from 'socket.io-client';
import toast                          from 'react-hot-toast';
import { api }                        from '../api';
import { Item, List }                 from './listTypes';
import { InboxArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { t } from '../i18n';

/* ───────── доп‑типы ───────── */
interface Invitation {
  listId: string;
  listName: string;
  inviterUsername: string;
  inviterEmail: string;
}

interface ListState {
  /* data */
  lists: List[];
  currentList: List | null;
  invitations: Invitation[];

  /* ui */
  isLoadingLists: boolean;
  isLoadingCurrentList: boolean;
  error: string | null;
  isConnected: boolean;

  /* socket */
  socket: Socket | null;
  connectSocket(token: string): void;
  disconnectSocket(): void;
  leaveListRoom(id: string): void;

  /* helpers */
  clearCurrentList(): void;

  /* lists */
  fetchLists(): Promise<void>;
  fetchListById(id: string): Promise<void>;
  createList(name: string): Promise<List | null>;
  deleteListAPI(id: string): Promise<void>;

  /* items */
  addItemAPI(listId: string, payload: Partial<Item> & { name: string }): Promise<void>;
  toggleItemAPI(listId: string, itemId: string): Promise<void>;
  removeItemAPI(listId: string, itemId: string): Promise<void>;

  /* invites */
  inviteUserToListAPI(listId: string, email: string): Promise<void>;
  acceptInvite(listId: string, userId: string): void;
  declineInvite(listId: string): void;

  /* ws handlers */
  handleListUpdate(l: List): void;
  handleListDeleted(d: { listId: string }): void;
  handleItemAdded(p: { listId: string; item: Item }): void;
  handleItemUpdated(p: { listId: string; item: Item }): void;
  handleItemDeleted(p: { listId: string; itemId: string }): void;
  handleInvitation(p: Invitation): void;

  fetchInvitations(): Promise<void>;
}

const SOCKET_URL = (import.meta.env.VITE_BACKEND_URL as string).replace('/api', '');
const LIST       = (p = '') => `/lists${p}`;

export const useListStore = create<ListState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      /* ───────── базовый state ───────── */
      lists: [], currentList: null, invitations: [],
      isLoadingLists: false, isLoadingCurrentList: false,
      error: null, isConnected: false, socket: null,

      clearCurrentList: () => set({ currentList: null }),

      /* ───────── socket ───────── */
      connectSocket(token) {
        if (get().socket) return;
        const s = io(SOCKET_URL, { auth: { token } });

        s.on('connect',    () => set({ isConnected: true }));
        s.on('disconnect', () => set({ socket: null, isConnected: false }));

        /* list‑level */
        s.on('listUpdate',  get().handleListUpdate);
        s.on('listDeleted', get().handleListDeleted);
        s.on('listCreated', (l: List) => set(st => { st.lists.unshift(l); }));

        /* item‑level */
        s.on('itemAdded',    get().handleItemAdded);
        s.on('itemUpdated',  get().handleItemUpdated);   // на всякий
        s.on('itemToggled',  get().handleItemUpdated);   // новый ev из backend
        s.on('itemDeleted',  get().handleItemDeleted);

        /* приглашения */
        // s.on('invitePending', get().handleInvitation);

        // Обработка ошибки истёкшего jwt
        s.on('connect_error', (err) => {
          if (err.message === 'jwt_expired') {
            localStorage.removeItem('authToken');
            toast.error('Сессия истекла, войдите снова');
            window.location.replace('/login?expired=1');
          }
        });

        set({ socket: s });
      },

      disconnectSocket() {
        get().socket?.disconnect();
        set({ socket: null, isConnected: false });
      },

      leaveListRoom: id => get().socket?.emit('leaveList', id),

      /* ───────── LISTS ───────── */
      async fetchLists() {
        set({ isLoadingLists: true, error: null });
        try {
          const lists = await api<List[]>(LIST());
          set({ lists, isLoadingLists: false });
        } catch (e: any) {
          set({ error: e.message, isLoadingLists: false });
        }
      },

      async fetchListById(id) {
        set({ isLoadingCurrentList: true, error: null });
        try {
          const list = await api<List>(LIST(`/${id}`));
          set({ currentList: list, isLoadingCurrentList: false });
          get().socket?.emit('joinList', id);
        } catch (e: any) {
          set({ error: e.message, isLoadingCurrentList: false });
        }
      },

      async createList(name) {
        console.log('[listStore] ▶ createList:', name);
        try {
          const list = await api<List>(LIST(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          console.log('[listStore] ✅ createList returned:', list);
          set(st => { st.lists.unshift(list); });
          return list;
        } catch (e: any) {
          console.error('[listStore] ❌ createList ERROR:', {
            message: e.message,
            response: (e as any).response,
            data:     (e as any).data,
          });
          toast.error('Failed to create list: ' + (e.message || 'Unknown'));
          return null;
        }
      },

      async deleteListAPI(id) {
        try {
          await api(LIST(`/${id}`), { method: 'DELETE' });
          set(st => {
            st.lists = st.lists.filter(l => l._id !== id);
            if (st.currentList?._id === id) st.currentList = null;
          });
          toast.success('List deleted');
        } catch (e: any) { toast.error(e?.message || 'Delete error'); }
      },

      /* ───────── ITEMS ───────── */
      async addItemAPI(listId, payload) {
        try {
          const added = await api<Item>(LIST(`/${listId}/items`), {
            method: 'POST', body: JSON.stringify(payload),
          });
          /* optimistic update автора */
          get().handleItemAdded({ listId, item: added });
        } catch (e: any) { toast.error(e?.message || 'Failed'); }
      },

      /* toggle теперь сразу возвращает обновлённый item */
      async toggleItemAPI(listId, itemId) {
        try {
          const { item } = await api<{ item: Item }>(
            LIST(`/${listId}/items/${itemId}/toggle-bought`), { method: 'PATCH' }
          );
          get().handleItemUpdated({ listId, item });
        } catch (e: any) { toast.error(e?.message || 'Toggle error'); }
      },

      async removeItemAPI(listId, itemId) {
        await api(LIST(`/${listId}/items/${itemId}`), { method: 'DELETE' });
        /* optimistic */
        get().handleItemDeleted({ listId, itemId });
      },

      /* ───────── INVITES ───────── */
      async inviteUserToListAPI(listId, email) {
        await api(LIST(`/${listId}/share`), {
          method: 'POST', body: JSON.stringify({ email }),
        });
      },
      acceptInvite: async (listId: string, userId: string) => {
        try {
          await api(`/lists/${listId}/invite/${userId}/accept`, { method: 'PUT' });
          // убираем pending‐invite из списка
          set(st => {
            st.invitations = st.invitations.filter(i => i.listId !== listId);
          });
          // подтягиваем свежий список, чтобы sharedWith[].status обновился
          await get().fetchListById(listId);
        } catch (e: any) {
          toast.error('Не удалось принять приглашение: ' + e.message);
        }
      },
      
      declineInvite: async (listId: string, userId: string) => {
        try {
          await api(`/lists/${listId}/invite/${userId}/decline`, { method: 'PUT' });
          set(st => {
            st.invitations = st.invitations.filter(i => i.listId !== listId);
          });
          await get().fetchListById(listId);
        } catch (e: any) {
          toast.error('Не удалось отклонить приглашение: ' + e.message);
        }
      },

      /* ───────── WS handlers ───────── */
      handleListUpdate(l) {
        set(st => {
          const i = st.lists.findIndex(x => x._id === l._id);
          if (i > -1) st.lists[i] = l; else st.lists.unshift(l);
          if (st.currentList?._id === l._id) st.currentList = l;
        });
      },

      handleListDeleted({ listId }) {
        set(st => {
          st.lists = st.lists.filter(x => x._id !== listId);
          if (st.currentList?._id === listId) st.currentList = null;
        });
        toast.error('List was deleted');
      },

      handleItemAdded({ listId, item }) {
        set(st => {
          if (st.currentList?._id === listId) st.currentList.items.push(item);
          const L = st.lists.find(l => l._id === listId);
          if (L) L.items.push(item);
        });
      },

      /* itemUpdated / itemToggled */
      handleItemUpdated({ listId, item }) {
        const patch = (arr: Item[]) => {
          const i = arr.findIndex(x => x._id === item._id);
          if (i > -1) arr[i] = item;
        };
        set(st => {
          if (st.currentList?._id === listId) patch(st.currentList.items);
          const L = st.lists.find(l => l._id === listId);
          if (L) patch(L.items);
        });
      },

      handleItemDeleted({ listId, itemId }) {
        const del = (arr: Item[]) => arr.filter(i => i._id !== itemId);
        set(st => {
          if (st.currentList?._id === listId)
            st.currentList.items = del(st.currentList.items as Item[]);
          const L = st.lists.find(l => l._id === listId);
          if (L) L.items = del(L.items as Item[]);
        });
      },

      handleInvitation(inv) {
        set(st => {
          if (!st.invitations.find(i => i.listId === inv.listId)) {
            st.invitations.push(inv);
            toast.success(`You've been invited to "${inv.listName}"`);
          }
        });
      },

      async fetchInvitations() {
        try {
          // Получаем массив списков, где вы приглашены (pending)
          const lists = await api<
            Array<{
              _id: string;
              name: string;
              owner: { _id: string; username: string; email: string };
            }>
          >(LIST('/invitations'));

          // Маппим в Invitation[]
          const invs: Invitation[] = lists.map(l => ({
            listId: l._id,
            listName: l.name,
            inviterUsername: l.owner.username,
            inviterEmail: l.owner.email,
          }));

          set({ invitations: invs });
        } catch (e: any) {
          console.error('[listStore] fetchInvitations failed', e);
          toast.error('Не удалось загрузить приглашения');
        }
      },
    }))
  )
);
