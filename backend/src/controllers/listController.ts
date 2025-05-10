// File: C:\Users\galym\Desktop\ShopSmart\backend\src\controllers\listController.ts
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

import List, { IItem } from '../models/List';
import User             from '../models/User';

/* ─────────── типы ─────────── */
type Role   = 'viewer' | 'editor';
type Status = 'pending' | 'accepted' | 'declined';

interface ISharedEntry {
  user  : mongoose.Types.ObjectId;
  role  : Role;
  status: Status;
}

/* ─────────── маленький helper ─────────── */
const ioOf = (req: Request) => (req as Request & { io?: any }).io;

/* ══════════════════════════════════════════════════════════════ */
/*  GET  /api/lists                                               */
/* ══════════════════════════════════════════════════════════════ */
export async function getAllLists(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authorised' });

    const lists = await List.find({
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, status: 'accepted' } } }
      ]
    })
      .populate('owner', 'username email')
      .populate('sharedWith.user', 'username email')
      .sort({ updatedAt: -1 })
      .lean();

    res.json(lists);
  } catch (err) { next(err); }
}

/* ══════════════════════════════════════════════════════════════ */
/*  POST /api/lists/:id/share      { email, role? }               */
/* ══════════════════════════════════════════════════════════════ */
export async function shareList(req: Request, res: Response, next: NextFunction) {
  try {
    const { id }   = req.params;
    const { email, role = 'viewer' } = req.body as { email: string; role?: Role };

    if (!email) return res.status(400).json({ message: 'Email required' });

    /* — 1. проверки — */
    const [list, userToAdd] = await Promise.all([
      List.findById(id),
      User.findOne({ email: email.toLowerCase().trim() }),
    ]);

    if (!list)        return res.status(404).json({ message: 'List not found' });
    if (!userToAdd)   return res.status(404).json({ message: 'User not found' });
    if (!list.owner.equals(req.user!._id))
      return res.status(403).json({ message: 'Only owner can share' });

    /* — 2. создаём / обновляем запись — */
    const entry = list.sharedWith.find(e => e.user.equals(userToAdd._id));

    if (entry) {                    // уже был – апдейтим
      entry.role   = role;
      entry.status = 'pending';
    } else {                        // новый
      list.sharedWith.push({
        user:   userToAdd._id,
        role,
        status: 'pending',
      } as ISharedEntry);
    }

    await list.save();

    const populated = await list.populate([
      { path: 'owner',           select: 'username email' },
      { path: 'sharedWith.user', select: 'username email' },
    ]);

    /* — 3. ответ + WebSocket — */
    res.json({ message: `Invitation sent to ${userToAdd.email}`, list: populated });

    ioOf(req)
      ?.to(`user_${userToAdd._id}`)
      .emit('invitePending', {
        listId:  list._id,
        listName:list.name,
        role,
      });

    ioOf(req)
      ?.to(`list_${list._id}`)
      .emit('listUpdate', populated);

  } catch (err) { next(err); }
}

/* ══════════════════════════════════════════════════════════════ */
/*  PUT /api/lists/:id/invite/:userId/accept|decline              */
/* ══════════════════════════════════════════════════════════════ */
export async function respondToInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, userId } = req.params;             // listId, invitedUser
    const action         = req.path.endsWith('/accept') ? 'accepted' : 'declined';

    if (req.user!._id.toString() !== userId)
      return res.status(403).json({ message: 'You cannot respond for another user' });

    const list = await List.findOne({
      _id: id,
      'sharedWith.user': userId,
    });
    if (!list) return res.status(404).json({ message: 'Invitation not found' });

    const entry = list.sharedWith.find(e => e.user.equals(userId));
    if (!entry) return res.status(404).json({ message: 'Invitation entry missing' });

    entry.status = action as Status;
    await list.save();

    const populated = await list.populate([
      { path: 'owner',           select: 'username email' },
      { path: 'sharedWith.user', select: 'username email' },
    ]);

    // — уведомляем всех участников списка свежей копией
    req.io?.to(`list_${list._id}`).emit('listUpdate', populated);

    res.json({ message: `Invitation ${action}`, list: populated });
  } catch (err) { next(err); }
}

/* ══════════════════════════════════════════════════════════════ */
/*  PATCH /api/lists/:id/role/:userId        { role }            */
/* ══════════════════════════════════════════════════════════════ */
export async function changeRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, userId } = req.params;
    const { role }       = req.body as { role: Role };

    const list = await List.findById(id);
    if (!list)               return res.status(404).json({ message: 'List not found' });
    if (!list.owner.equals(req.user!._id))
      return res.status(403).json({ message: 'Only owner can change roles' });

    const entry = list.sharedWith.find(e => e.user.equals(userId));
    if (!entry) return res.status(404).json({ message: 'User not in sharedWith' });

    entry.role = role;
    await list.save();

    /* WS notify */
    req.io?.to(`list_${id}`).emit('roleChanged', { listId: id, userId, role });

    res.json({ message: 'Role updated', list });
  } catch (err) { next(err); }
}

export async function createList(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('createList body:', req.body);
    console.log('createList user:', req.user);
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'Name required' });

    const newList = await List.create({
      _id:   uuidv4(),
      name:  name.trim(),
      owner: req.user!._id,
      items: [],
      sharedWith: [],
    });

    const populated = await List.findById(newList._id)
      .populate('owner', 'username email _id')
      .lean();

    ioOf(req)?.to(`user_${req.user!._id}`).emit('listCreated', populated);
    res.status(201).json(populated);
  } catch (e) { next(e); }
}

export async function getList(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await List.findById(req.params.id)
      .populate('owner',           'username email _id')
      .populate('sharedWith.user', 'username email _id')
      .lean();
    if (!list) return res.status(404).json({ message: 'List not found' });
    res.json(list);
  } catch (e) { next(e); }
}

/* ─────────────────────── items: add ──────────────────────── */
export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const listId = req.params.id;
    const {
      name,
      quantity     = 1,
      unit         = 'pcs',
      pricePerUnit,
      category     = 'Без категории',
    } = req.body;

    if (!name) return res.status(400).json({ message: 'name is required' });

    const totalCost =
      pricePerUnit != null ? +(quantity * pricePerUnit).toFixed(2) : undefined;

    const newItem: Partial<IItem> & { _id: string } = {
      _id: uuidv4(),
      name,
      quantity,
      unit,
      pricePerUnit,
      totalCost,
      category,
      boughtBy: [],     // ← ключ для «кто купит»
      isBought: false,
    };

    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    list.items.push(newItem as any);
    await list.save();

    ioOf(req)?.to(`list_${listId}`).emit('itemAdded', { listId, item: newItem });
    res.status(201).json(newItem);
  } catch (e) { next(e); }
}

/* ── items: toggle who is going to buy ────────────────────── */
export async function toggleBought(req: Request, res: Response, next: NextFunction) {
  try {
    const { id: listId, itemId } = req.params;
    const userId = req.user!._id;               // на будущее (boughtBy)

    /* 1. находим список */
    const list = await List.findById(listId);
    if (!list) return res.status(404).json({ message: 'List not found' });

    /* 2. находим сам товар (DocumentArray нет, поэтому обычный .find) */
    const item = list.items.find(i => i._id === itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    /* 3. меняем флаг isBought */
    item.isBought = !item.isBought;

    /* 4. (опционально) ведём учёт, кто «взял» пункт */
    const idx = item.boughtBy?.findIndex(u => u.toString() === userId.toString()) ?? -1;
    if (item.isBought) {
      if (idx === -1) item.boughtBy?.push(new Types.ObjectId(userId));
    } else {
      if (idx > -1)   item.boughtBy?.splice(idx, 1);
    }

    await list.save();                          // ⬅️  сохраняем

    /* 5. готовим «плоский» объект, пригодный для фронта */
    const plainItem = {
      ...((item as unknown as mongoose.Document).toObject()), // Сначала unknown, затем Document для toObject
      boughtBy: item.boughtBy,                 // оставляем, если нужно
    };

    /* 6. WS всем участникам списка */
    req.io?.to(`list_${listId}`).emit('itemToggled', { listId, item: plainItem });

    /* 7. ответ автору действия */
    res.json({ item: plainItem });
  } catch (e) { next(e); }
}

  
  
// --- PATCH /api/lists/:id/items/:itemId ---
export async function updateItem(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Request received`);
    try {
        const { isBought, name } = req.body;
        console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Request body:`, req.body);

        const list = await List.findById(listId);
        if (!list) {
            console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Error: List not found`);
            return res.status(404).json({ message: 'List not found' });
        }

        const item = list.items.id(itemId);
        if (!item) {
            console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Error: Item not found`);
            return res.status(404).json({ message: 'Item not found in this list' });
        }
        console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Found item:`, item.toObject());

        let updated = false;
        if (typeof isBought === 'boolean' && item.isBought !== isBought) {
            item.isBought = isBought;
            updated = true;
            console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Updated isBought to ${isBought}`);
        }
        if (typeof name === 'string' && name.trim().length > 0 && item.name !== name.trim()) {
            item.name = name.trim();
            updated = true;
             console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Updated name to "${name.trim()}"`);
        }

        if (!updated) {
            console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - No changes detected, returning current item.`);
            return res.json(item.toObject());
        }

        console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Attempting to save updated list...`);
        await list.save(); // <--- ТОЧКА СОХРАНЕНИЯ
         console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - List saved successfully!`);

        console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Sending updated item response.`);
         // --- Добавим emit после успешного сохранения ---
         const io = (req as Request & { io?: any }).io;
         if (io) {
              console.log(`[WS] Emitting itemUpdated to list_${listId}`);
              // Отправляем только обновленный элемент
             io.to(`list_${listId}`).emit('itemUpdated', { listId: listId, item: item.toObject() });
              // Опционально: Эмитить listUpdate
         }
         // --------------------------------------------
        res.json(item.toObject());
    } catch (err) {
        console.error(`[API] PATCH /api/lists/${listId}/items/${itemId} - Error updating item:`, err);
        next(err);
    }
}

// --- DELETE /api/lists/:id/items/:itemId ---
export async function deleteItem(req: Request, res: Response, next: NextFunction) {
     const { id: listId, itemId } = req.params;
     console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Request received`);
    try {
         console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Attempting to pull item...`);
        const result = await List.updateOne( { _id: listId }, { $pull: { items: { _id: itemId } } } );
         console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Update result:`, result);

        if (result.matchedCount === 0) {
            console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Error: List not found`);
            return res.status(404).json({ message: 'List not found' });
        }
        if (result.modifiedCount === 0) {
             console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Error: Item not found or not removed`);
            return res.status(404).json({ message: 'Item not found in this list' });
        }

        console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Item removed successfully. Sending response.`);
         // --- Добавим emit после успешного удаления ---
         const io = (req as Request & { io?: any }).io;
         if (io) {
             console.log(`[WS] Emitting itemDeleted to list_${listId}`);
             // Отправляем ID удаленного элемента
             io.to(`list_${listId}`).emit('itemDeleted', { listId: listId, itemId: itemId });
             // Опционально: Эмитить listUpdate
         }
         // --------------------------------------------
        res.status(200).json({ message: 'Item deleted successfully', itemId });

    } catch (err) {
         console.error(`[API] DELETE /api/lists/${listId}/items/${itemId} - Error deleting item:`, err);
        next(err);
    }
}

  // DELETE /api/lists/:id — Delete a list (owner only)
  export async function deleteList(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    const userId = req.user?._id; // Получаем ID владельца из middleware
    console.log(`[API] DELETE /api/lists/${listId} - Request received from user ${userId}`);

    if (!userId) {
        // Должно быть поймано 'protect', но проверим
        console.log(`[API] DELETE /api/lists/${listId} - Error: User not authenticated`);
        return res.status(401).json({ message: 'User not authenticated' });
    }

    try {
        console.log(`[API] DELETE /api/lists/${listId} - Attempting to find and delete list owned by ${userId}...`);
        // Находим и удаляем список, ТОЛЬКО если текущий пользователь является владельцем
        const result = await List.deleteOne({ _id: listId, owner: userId });
        console.log(`[API] DELETE /api/lists/${listId} - Deletion result:`, result);

        if (result.deletedCount === 0) {
            // Если ничего не удалено, значит, либо список не найден, либо пользователь не владелец
            // Проверим, существует ли список вообще, чтобы дать более точную ошибку
            const listExists = await List.findById(listId).select('_id owner').lean();
            if (!listExists) {
                console.log(`[API] DELETE /api/lists/${listId} - Error: List not found`);
                return res.status(404).json({ message: 'List not found' });
            } else {
                // Список существует, но пользователь не владелец (хотя protect должен был это поймать)
                console.warn(`[API] DELETE /api/lists/${listId} - Error: User ${userId} is not the owner or list not found`);
                return res.status(403).json({ message: 'You are not authorized to delete this list' });
            }
        }

        console.log(`[API] DELETE /api/lists/${listId} - List deleted successfully. Sending response.`);
        // --- Добавим emit об удалении ---
        const io = (req as Request & { io?: any }).io;
        if (io) {
            // Уведомляем всех, кто был в комнате этого списка (включая владельца)
            console.log(`[WS] Emitting listDeleted event for list_${listId}`);
            io.to(`list_${listId}`).emit('listDeleted', { listId }); // Отправляем ID удаленного списка
            // Также можно уведомить создателя и тех, с кем поделились, чтобы они убрали список из UI
            if (req.user?._id) {
                io.to(`user_${req.user._id}`).emit('listDeleted', { listId });
            }
            // TODO: Уведомить sharedWith пользователей
        }
        // ---------------------------------
        res.status(200).json({ message: 'List deleted successfully', listId }); // Возвращаем ID для фронтенда

    } catch (err) {
        console.error(`[API] DELETE /api/lists/${listId} - Error deleting list:`, err);
        next(err);
    }
  }

// --- Sharing Controllers (Добавим немного логов) ---
export const inviteUser = async (req: Request, res: Response, next: NextFunction) => {
    const listId = req.params.id;
    const email = req.body.email;
    console.log(`[API] POST /api/lists/${listId}/share - Inviting user ${email}`);
    try {
        // ... (основная логика без изменений) ...
        const { email } = req.body;
        const ownerId = req.user?._id;
        if (!email || typeof email !== 'string') { /* ... */ }
        if (!ownerId) { /* ... */ }
        const list = await List.findById(listId);
        if (!list) { /* ... */ }
        const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToInvite) { /* ... */ }
        if (userToInvite._id.equals(ownerId)) { /* ... */ }
        if (list.sharedWith.some(id => id.equals(userToInvite._id))) { /* ... */ }

        list.sharedWith.push(userToInvite._id);
        await list.save();
        console.log(`[API] POST /api/lists/${listId}/share - User ${email} added to sharedWith`);

        const populatedList = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id')
            .lean();

        // --- Добавим emit ---
        const io = (req as Request & { io?: any }).io;
        if (io) {
            // Уведомляем всех в комнате (включая владельца), что список обновился
             console.log(`[WS] Emitting listUpdate after invite to list_${listId}`);
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            // Отдельно уведомляем приглашенного пользователя (если он онлайн)
            // Нужно знать его socket ID или иметь комнату user_userId
             console.log(`[WS] Emitting listSharedWithYou to user_${userToInvite._id}`);
             io.to(`user_${userToInvite._id}`).emit('listSharedWithYou', populatedList);
        }
        // ------------------

        res.status(200).json({ message: `User ${userToInvite.username} invited successfully`, list: populatedList });

    } catch (error) {
        console.error(`[API] POST /api/lists/${listId}/share - Error inviting user ${email}:`, error);
        next(error);
    }
};

export const removeUserAccess = async (req: Request, res: Response, next: NextFunction) => {
  const { id, userId } = req.params;
  console.log(`[API] DELETE /api/lists/${id}/share/${userId} - Removing user access`);
  try {
    const ownerId = req.user?._id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid userId' });
    }
    if (!ownerId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const list = await List.findById(id);
    if (!list) {
      return res.status(404).json({ message: 'List not found' });
    }
    const userObjectIdToRemove = new mongoose.Types.ObjectId(userId);
    const initialLength = list.sharedWith.length;
    list.sharedWith = list.sharedWith.filter(e => !e.user.equals(userObjectIdToRemove));
    if (list.sharedWith.length === initialLength) {
      return res.status(404).json({ message: 'User not found in sharedWith' });
    }

    await list.save();

    const populatedList = await List.findById(id)
      .populate('owner', 'username email _id')
      .populate('sharedWith.user', 'username email _id')
      .lean();

    // --- WS уведомления ---
    const io = (req as Request & { io?: any }).io;
    if (io) {
      io.to(`list_${id}`).emit('listUpdate', populatedList);
      io.to(`user_${userId}`).emit('listAccessRemoved', { listId: id });
    }

    res.status(200).json({ message: 'User access removed successfully', list: populatedList });
  } catch (error) {
    next(error);
  }
};

// --- Duplicate Removal (Добавим логи) ---
export const removeDuplicates = async (req: Request, res: Response, next: NextFunction) => {
    const listId = req.params.id;
    console.log(`[API] POST /api/lists/${listId}/remove-duplicates - Request received`);
    try {
        const list = await List.findById(listId);
        if (!list) {
             console.log(`[API] POST /api/lists/${listId}/remove-duplicates - Error: List not found`);
            return res.status(404).json({ message: 'List not found' });
        }

        const uniqueItemsMap: Map<string, IListItem> = new Map();
        // ... (логика поиска дубликатов без изменений) ...
        for (const item of list.items) { /* ... */ }
        const newItemsArray = Array.from(uniqueItemsMap.values());
        const removedCount = list.items.length - newItemsArray.length;
         console.log(`[API] POST /api/lists/${listId}/remove-duplicates - Found ${removedCount} duplicates.`);

        if (removedCount > 0) {
            list.items = newItemsArray as any;
            console.log(`[API] POST /api/lists/${listId}/remove-duplicates - Attempting to save list with duplicates removed...`);
            await list.save();
             console.log(`[API] POST /api/lists/${listId}/remove-duplicates - List saved successfully!`);

            const populatedList = await List.findById(listId)
                .populate('owner', 'username email _id')
                .populate('sharedWith', 'username email _id')
                .lean();

             // --- Добавим emit ---
             const io = (req as Request & { io?: any }).io;
             if (io) {
                  console.log(`[WS] Emitting listUpdate after removing duplicates to list_${listId}`);
                 io.to(`list_${listId}`).emit('listUpdate', populatedList);
             }
            // ------------------
            res.status(200).json({ message: `${removedCount} duplicate item(s) removed.`, list: populatedList });
        } else {
             console.log(`[API] POST /api/lists/${listId}/remove-duplicates - No duplicates found. Sending response.`);
            const currentPopulatedList = await List.findById(listId)
                .populate('owner', 'username email _id')
                .populate('sharedWith', 'username email _id')
                .lean();
            res.status(200).json({ message: 'No duplicates found.', list: currentPopulatedList });
        }
    } catch (error) {
        console.error(`[API] POST /api/lists/${listId}/remove-duplicates - Error removing duplicates:`, error);
        next(error);
    }
};

export const getInvitations = async (req, res) => {
  const userId = req.user._id;
  const invites = await List.find({
    sharedWith: { $elemMatch: { user: userId, status: 'pending' } }
  })
  .populate('owner', 'username email')
  .populate('sharedWith.user', 'username email');
  res.json(invites);
};