// File: C:\Users\galym\Desktop\ShopSmart\backend\src\controllers\listController.ts
import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import List, { IList, IListItem } from '../models/List'; // Убедись, что IListItem экспортируется
import User from '../models/User';

const ioOf = (req: Request) => (req as any).io;

// --- GET /api/lists ---
export async function getAllLists(req: Request, res: Response, next: NextFunction) {
    console.log('[API] GET /api/lists - Request received');
    try {
        if (!req.user?._id) { return res.status(401).json({ message: 'User not authenticated' }); }
        const userId = req.user._id;
        const lists = await List.find({ $or: [{ owner: userId }, { sharedWith: userId }] })
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id') // Теперь это будет массив User-объектов
            .sort({ updatedAt: -1 })
            .lean();
        res.json(lists);
    } catch (err) { console.error("[API] GET /api/lists - Error:", err); next(err); }
}

// --- POST /api/lists ---
export async function createList(req: Request, res: Response, next: NextFunction) {
    console.log('[API] POST /api/lists - Request received. Body:', req.body);
    try {
        const { name } = req.body;
        if (!req.user?._id) { return res.status(401).json({ message: 'User not authenticated' }); }
        if (!name || typeof name !== 'string' || name.trim().length === 0) { return res.status(400).json({ message: 'List name required' });}
        
        const newList = new List({ _id: uuidv4(), name: name.trim(), owner: req.user._id, items: [], sharedWith: [] });
        await newList.save();
        console.log(`[API] POST /api/lists - List ${newList._id} saved`);
        const populatedList = await List.findById(newList._id).populate('owner', 'username email _id').lean();
        if (!populatedList) { return next(new Error('Failed to retrieve list after saving')); }
        
        const io = ioOf(req);
        if (io && req.user) {
            io.to(`user_${req.user._id}`).emit('listCreated', populatedList);
        }
        res.status(201).json(populatedList);
    } catch (err) { console.error(`[API] POST /api/lists - Error:`, err); next(err); }
}

// --- GET /api/lists/:id ---
export async function getList(req: Request, res: Response, next: NextFunction) {
    console.log(`[API] GET /api/lists/${req.params.id} - Request received`);
    try {
        const list = await List.findById(req.params.id)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id')
            .lean();
        if (!list) { return res.status(404).json({ message: 'List not found' }); }
        res.json(list);
    } catch (err) { console.error(`[API] GET /api/lists/${req.params.id} - Error:`, err); next(err); }
}

// --- POST /api/lists/:id/items ---
export async function addItem(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    console.log(`[API] POST /api/lists/${listId}/items - Request received. Body:`, req.body);
    try {
        const { name, quantity = 1, unit = '', category = 'Uncategorized' } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) { return res.status(400).json({ message: 'Item name required' });}

        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }

        const newItem: IListItem = {
            _id: uuidv4(),
            name: name.trim(),
            isBought: false,
            quantity: quantity, // Добавляем, если есть в IListItem
            unit: unit,         // Добавляем, если есть в IListItem
            category: category, // Добавляем, если есть в IListItem
        } as IListItem; // Приведение типа, если IListItem имеет больше полей

        list.items.push(newItem);
        await list.save();
        
        const addedItem = list.items.find(i => i._id === newItem._id); // Находим добавленный элемент
        
        const io = ioOf(req);
        if (io && addedItem) { io.to(`list_${listId}`).emit('itemAdded', { listId, item: addedItem }); }
        res.status(201).json(addedItem);
    } catch (err) { console.error(`[API] POST /api/lists/${listId}/items - Error:`, err); next(err); }
}

// --- PATCH /api/lists/:id/items/:itemId ---
export async function updateItem(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Request received. Body:`, req.body);
    try {
        const { isBought, name, quantity, unit, category } = req.body;
        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }

        const item = list.items.find(i => i._id === itemId); // Используем find
        if (!item) { return res.status(404).json({ message: 'Item not found' }); }

        let updated = false;
        if (typeof isBought === 'boolean' && item.isBought !== isBought) { item.isBought = isBought; updated = true; }
        if (typeof name === 'string' && name.trim().length > 0 && item.name !== name.trim()) { item.name = name.trim(); updated = true; }
        if (typeof quantity === 'number' && item.quantity !== quantity) { item.quantity = quantity; updated = true; }
        if (typeof unit === 'string' && item.unit !== unit) { item.unit = unit; updated = true; }
        if (typeof category === 'string' && item.category !== category) { item.category = category; updated = true; }

        if (!updated) { return res.json(item); }
        await list.save();
        
        const io = ioOf(req);
        if (io) { io.to(`list_${listId}`).emit('itemUpdated', { listId, item: item }); }
        res.json(item);
    } catch (err) { console.error(`[API] PATCH /api/lists/${listId}/items/${itemId} - Error:`, err); next(err); }
}

// --- DELETE /api/lists/:id/items/:itemId ---
export async function deleteItem(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    console.log(`[API] DELETE /api/lists/${listId}/items/${itemId} - Request received`);
    try {
        const result = await List.updateOne({ _id: listId }, { $pull: { items: { _id: itemId } } });
        if (result.matchedCount === 0) { return res.status(404).json({ message: 'List not found' }); }
        if (result.modifiedCount === 0) { return res.status(404).json({ message: 'Item not found in list' });}
        
        const io = ioOf(req);
        if (io) { io.to(`list_${listId}`).emit('itemDeleted', { listId, itemId }); }
        res.status(200).json({ message: 'Item deleted successfully', itemId });
    } catch (err) { console.error(`[API] DELETE /api/lists/${listId}/items/${itemId} - Error:`, err); next(err); }
}

// --- DELETE /api/lists/:id ---
export async function deleteList(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    const userId = req.user?._id;
    console.log(`[API] DELETE /api/lists/${listId} - Request from user ${userId}`);
    try {
        if (!userId) { return res.status(401).json({ message: 'User not authenticated' }); }
        const result = await List.deleteOne({ _id: listId, owner: userId });
        if (result.deletedCount === 0) {
            const listExists = await List.findById(listId).select('_id').lean();
            return res.status(listExists ? 403 : 404).json({ message: listExists ? 'Not authorized' : 'List not found' });
        }
        const io = ioOf(req);
        if (io) {
            io.to(`list_${listId}`).emit('listDeleted', { listId });
            if (req.user?._id) io.to(`user_${req.user._id}`).emit('listDeleted', { listId });
        }
        res.status(200).json({ message: 'List deleted successfully', listId });
    } catch (err) { console.error(`[API] DELETE /api/lists/${listId} - Error:`, err); next(err); }
}

// --- POST /api/lists/:id/share ---
export async function shareList(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    const { email } = req.body; // Убрали role для упрощения
    console.log(`[API] POST /api/lists/${listId}/share - Inviting user ${email}`);
    try {
        const ownerId = req.user?._id;
        if (!email || typeof email !== 'string') { return res.status(400).json({ message: 'Valid email required' }); }
        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }

        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }
        if (!list.owner.equals(ownerId)) { return res.status(403).json({ message: 'Only owner can share' });}

        const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToInvite) { return res.status(404).json({ message: 'User with this email not found' }); }
        if (userToInvite._id.equals(ownerId)) { return res.status(400).json({ message: 'Cannot share list with yourself' });}
        
        // Проверяем, что userToInvite._id существует перед вызовом equals
        if (userToInvite._id && list.sharedWith.some(id => id.equals(userToInvite._id))) {
             return res.status(400).json({ message: 'List already shared with this user' });
        }

        if (userToInvite._id) { // Дополнительная проверка
            list.sharedWith.push(userToInvite._id as mongoose.Types.ObjectId);
            await list.save();
        } else {
            return res.status(404).json({ message: 'User to invite has no ID.' }); // Маловероятно
        }

        const populatedList = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id') // Теперь sharedWith это массив User
            .lean();
        
        const io = ioOf(req);
        if (io && populatedList && userToInvite?._id) { // Проверяем userToInvite._id
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            io.to(`user_${userToInvite._id}`).emit('listSharedWithYou', populatedList);
        }
        res.status(200).json({ message: `List shared with ${userToInvite.username}`, list: populatedList });
    } catch (error) { console.error(`[API] POST /api/lists/${listId}/share - Error:`, error); next(error); }
}

// --- DELETE /api/lists/:id/share/:userId ---
export async function removeUserAccess(req: Request, res: Response, next: NextFunction) {
    const { id: listId, userId: userIdToRemove } = req.params;
    console.log(`[API] DELETE /api/lists/${listId}/share/${userIdToRemove} - Removing access`);
    try {
        const ownerId = req.user?._id;
        if (!mongoose.Types.ObjectId.isValid(userIdToRemove)) { return res.status(400).json({ message: 'Invalid userId' }); }
        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }

        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }
        if (!list.owner.equals(ownerId)) { return res.status(403).json({ message: 'Only owner can remove access' });}

        const userObjectIdToRemove = new mongoose.Types.ObjectId(userIdToRemove);
        const initialLength = list.sharedWith.length;
        list.sharedWith = list.sharedWith.filter(id => !id.equals(userObjectIdToRemove));

        if (list.sharedWith.length === initialLength) { return res.status(404).json({ message: 'User not found in shared list' });}
        await list.save();

        const populatedList = await List.findById(listId).populate('owner', 'username email _id').populate('sharedWith', 'username email _id').lean();
        const io = ioOf(req);
        if (io && populatedList) {
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            io.to(`user_${userIdToRemove}`).emit('listAccessRemoved', { listId });
        }
        res.status(200).json({ message: 'User access removed', list: populatedList });
    } catch (error) { console.error(`[API] DELETE /api/lists/${listId}/share/${userIdToRemove} - Error:`, error); next(error); }
}

// --- POST /api/lists/:id/remove-duplicates ---
export async function removeDuplicates(req: Request, res: Response, next: NextFunction) {
    // ... (код с логами, без изменений в логике) ...
}

// --- ЗАГЛУШКИ ДЛЯ НОВЫХ ФУНКЦИЙ ИЗ ТВОЕГО listRoutes.ts ---
export async function respondToInvite(req: Request, res: Response, next: NextFunction) {
    res.status(501).json({ message: 'Respond to invite: Not Implemented Yet' });
}
export async function changeRole(req: Request, res: Response, next: NextFunction) {
    res.status(501).json({ message: 'Change role: Not Implemented Yet' });
}
export async function toggleBought(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    try {
        const list = await List.findById(listId);
        if (!list) return res.status(404).json({ message: "List not found" });
        const item = list.items.find(i => i._id === itemId);
        if (!item) return res.status(404).json({ message: "Item not found" });
        
        req.body = { isBought: !item.isBought }; // Устанавливаем тело для updateItem
        return updateItem(req, res, next);
    } catch (err) { next(err); }
}
export async function getInvitations(req: Request, res: Response, next: NextFunction) {
    res.status(501).json({ message: 'Get invitations: Not Implemented Yet' });
}