// File: C:\Users\galym\Desktop\ShopSmart\backend\src\controllers\listController.ts
import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import List, { IList, IListItem, ISharedWith } from '../models/List';
import User from '../models/User';

const ioOf = (req: Request) => (req as any).io;

// --- GET /api/lists ---
export async function getAllLists(req: Request, res: Response, next: NextFunction) {
    console.log('[API] GET /api/lists - Request received');
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'Not authorised' });
        console.log(`[API] GET /api/lists - Fetching lists for user: ${userId}`);

        const lists = await List.find({
            $or: [
                { owner: userId },
                { sharedWith: { $elemMatch: { user: userId, status: 'accepted' } } }
            ]
        })
            .populate('owner', 'username email _id')
            .populate('sharedWith.user', 'username email _id')
            .sort({ updatedAt: -1 })
            .lean();

        console.log(`[API] GET /api/lists - Found ${lists.length} lists for user: ${userId}`);
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
    const listId = req.params.id;
    console.log(`[API] GET /api/lists/${listId} - Request received`);
    try {
        const list = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id')
            .lean();
        if (!list) {
            console.log(`[API] GET /api/lists/${listId} - List not found`);
            return res.status(404).json({ message: 'List not found' });
        }
        console.log(`[API] GET /api/lists/${listId} - List found, sending response`);
        res.json(list);
    } catch (err) { console.error(`[API] GET /api/lists/${listId} - Error:`, err); next(err); }
}

// --- POST /api/lists/:id/items ---
export async function addItem(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    console.log(`[API] POST /api/lists/${listId}/items - Request received. Body:`, req.body);
    try {
        // Убираем pricePerUnit и totalCost, так как их нет в IListItem
        const { name, quantity = 1, unit = '', category = 'Uncategorized' } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) { return res.status(400).json({ message: 'Item name required' });}

        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }

        const newItemData: IListItem = {
            _id: uuidv4(),
            name: name.trim(),
            isBought: false,
            quantity: quantity,
            unit: unit,
            category: category,
        };

        list.items.push(newItemData);
        await list.save();
        
        const addedItem = list.items.find(i => i._id === newItemData._id);
        
        const io = ioOf(req);
        if (io && addedItem) { io.to(`list_${listId}`).emit('itemAdded', { listId, item: addedItem.toObject ? addedItem.toObject() : addedItem }); }
        res.status(201).json(addedItem ? (addedItem.toObject ? addedItem.toObject() : addedItem) : newItemData);
    } catch (err) { console.error(`[API] POST /api/lists/${listId}/items - Error:`, err); next(err); }
}

// --- PATCH /api/lists/:id/items/:itemId ---
export async function updateItem(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    console.log(`[API] PATCH /api/lists/${listId}/items/${itemId} - Request received. Body:`, req.body);
    try {
        // Убираем pricePerUnit и totalCost
        const { isBought, name, quantity, unit, category } = req.body;
        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }

        const item = list.items.find(i => i._id === itemId);
        if (!item) { return res.status(404).json({ message: 'Item not found' }); }

        let updated = false;
        if (typeof isBought === 'boolean' && item.isBought !== isBought) { item.isBought = isBought; updated = true; }
        if (typeof name === 'string' && name.trim().length > 0 && item.name !== name.trim()) { item.name = name.trim(); updated = true; }
        if (typeof quantity === 'number' && item.quantity !== quantity) { item.quantity = quantity; updated = true; }
        if (typeof unit === 'string' && item.unit !== unit) { item.unit = unit; updated = true; }
        if (typeof category === 'string' && item.category !== category) { item.category = category; updated = true; }

        if (!updated) { return res.json(item.toObject ? item.toObject() : item); }
        await list.save();
        
        const io = ioOf(req);
        if (io) { io.to(`list_${listId}`).emit('itemUpdated', { listId, item: item.toObject ? item.toObject() : item }); }
        res.json(item.toObject ? item.toObject() : item);
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
    const { email, role = 'viewer' } = req.body as { email: string; role?: 'viewer' | 'editor' };
    console.log(`[API] POST /api/lists/${listId}/share - Inviting user ${email} with role ${role}`);
    try {
        const ownerId = req.user?._id;
        if (!email || typeof email !== 'string') { return res.status(400).json({ message: 'Valid email required' }); }
        if (!ownerId) { return res.status(401).json({ message: 'User not authenticated' }); }

        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }
        if (!list.owner.equals(ownerId)) { return res.status(403).json({ message: 'Only owner can share' }); }

        const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToInvite) { return res.status(404).json({ message: 'User with this email not found' }); }
        if (userToInvite._id.equals(ownerId)) { return res.status(400).json({ message: 'Cannot share list with yourself' }); }

        // Проверяем, есть ли уже такой пользователь в sharedWith
        const existingEntryIndex = list.sharedWith.findIndex(entry => entry.user.equals(userToInvite._id));
        if (existingEntryIndex > -1) {
            // Пользователь уже есть, обновляем роль и статус
            console.log(`[API] User ${email} already in sharedWith, updating role and status.`);
            list.sharedWith[existingEntryIndex].role = role;
            list.sharedWith[existingEntryIndex].status = 'pending';
        } else {
            // Новый пользователь, добавляем
            console.log(`[API] Adding new user ${email} to sharedWith.`);
            const newSharedEntry: ISharedWith = {
                user: userToInvite._id as Types.ObjectId,
                role: role,
                status: 'pending'
            };
            list.sharedWith.push(newSharedEntry);
        }
        await list.save();
        console.log(`[API] POST /api/lists/${listId}/share - List saved with updated sharedWith`);

        const populatedList = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith.user', 'username email _id')
            .lean();

        const io = ioOf(req);
        if (io && populatedList && userToInvite?._id) {
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            io.to(`user_${userToInvite._id}`).emit('invitePending', {
                listId: listId,
                listName: populatedList?.name,
                inviterUsername: req.user?.username,
                role: role
            });
        }
        res.status(200).json({ message: `Invitation sent to ${userToInvite.username}`, list: populatedList });
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
        if (!list.owner.equals(ownerId)) { return res.status(403).json({ message: 'Only owner can remove access' }); }

        const userObjectIdToRemove = new mongoose.Types.ObjectId(userIdToRemove);
        const initialLength = list.sharedWith.length;
        list.sharedWith = list.sharedWith.filter(entry => !entry.user.equals(userObjectIdToRemove));

        if (list.sharedWith.length === initialLength) { return res.status(404).json({ message: 'User not found in shared list' }); }
        await list.save();
        console.log(`[API] DELETE /api/lists/${listId}/share/${userIdToRemove} - User removed`);

        const populatedList = await List.findById(listId).populate('owner', 'username email _id').populate('sharedWith.user', 'username email _id').lean();
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
    const listId = req.params.id;
    console.log(`[API] POST /api/lists/${listId}/remove-duplicates - Request received`);
    try {
        const list = await List.findById(listId);
        if (!list) { return res.status(404).json({ message: 'List not found' }); }

        const uniqueItemsMap: Map<string, IListItem> = new Map();
        list.items.forEach(item => {
            const lowerCaseName = item.name.toLowerCase().trim();
            if (!uniqueItemsMap.has(lowerCaseName)) {
                uniqueItemsMap.set(lowerCaseName, item);
            } else {
                const existingItem = uniqueItemsMap.get(lowerCaseName)!;
                if (item.isBought) existingItem.isBought = true;
                uniqueItemsMap.set(lowerCaseName, existingItem);
            }
        });
        const newItemsArray = Array.from(uniqueItemsMap.values());
        const removedCount = list.items.length - newItemsArray.length;

        if (removedCount > 0) {
            list.items = newItemsArray as mongoose.Types.DocumentArray<IListItem & mongoose.Document>;
            await list.save();
            const populatedList = await List.findById(listId).populate('owner', 'username email _id').populate('sharedWith', 'username email _id').lean();
            const io = ioOf(req);
            if (io && populatedList) io.to(`list_${listId}`).emit('listUpdate', populatedList);
            res.status(200).json({ message: `${removedCount} duplicate item(s) removed.`, list: populatedList });
        } else {
            const currentPopulatedList = await List.findById(listId).populate('owner', 'username email _id').populate('sharedWith', 'username email _id').lean();
            res.status(200).json({ message: 'No duplicates found.', list: currentPopulatedList });
        }
    } catch (error) { console.error(`[API] POST /api/lists/${listId}/remove-duplicates - Error:`, error); next(error); }
}

// --- Дополнительные функции для работы с приглашениями и ролями ---
export async function respondToInvite(req: Request, res: Response, next: NextFunction) {
    const { id: listId, userId } = req.params;
    const action = req.path.endsWith('/accept') ? 'accepted' : 'declined';
    console.log(`[API] respondToInvite for list ${listId}, user ${userId}, action: ${action}`);
    try {
        if (req.user!._id.toString() !== userId) return res.status(403).json({ message: 'Cannot respond for another user' });

        const list = await List.findOneAndUpdate(
            { _id: listId, "sharedWith.user": userId },
            { $set: { "sharedWith.$.status": action } },
            { new: true }
        ).populate('owner', 'username email _id').populate('sharedWith.user', 'username email _id');

        if (!list) return res.status(404).json({ message: 'Invitation or list not found' });

        ioOf(req)?.to(`list_${listId}`).emit('listUpdate', list);
        ioOf(req)?.to(`user_${list.owner._id}`).emit('inviteResponded', { listId, userId, status: action });

        res.json({ message: `Invitation ${action}`, list });
    } catch (err) { next(err); }
}

export async function changeRole(req: Request, res: Response, next: NextFunction) {
    const { id: listId, userId } = req.params;
    const { role } = req.body as { role: 'viewer' | 'editor' };
    console.log(`[API] changeRole for list ${listId}, user ${userId}, to role: ${role}`);
    try {
        if (!role || !['viewer', 'editor'].includes(role)) return res.status(400).json({ message: 'Invalid role specified' });

        const list = await List.findOneAndUpdate(
            { _id: listId, owner: req.user!._id, "sharedWith.user": userId },
            { $set: { "sharedWith.$.role": role } },
            { new: true }
        ).populate('owner', 'username email _id').populate('sharedWith.user', 'username email _id');

        if (!list) return res.status(404).json({ message: 'List or user in sharedWith not found, or you are not the owner.' });

        ioOf(req)?.to(`list_${listId}`).emit('listUpdate', list);
        ioOf(req)?.to(`list_${listId}`).emit('roleChanged', { listId, userId, newRole: role });
        ioOf(req)?.to(`user_${userId}`).emit('yourRoleChanged', { listId, listName: list.name, newRole: role });

        res.json({ message: 'Role updated', list });
    } catch (err) { next(err); }
}

export async function toggleBought(req: Request, res: Response, next: NextFunction) {
    const { id: listId, itemId } = req.params;
    try {
        const list = await List.findById(listId);
        if (!list) return res.status(404).json({ message: "List not found" });
        const item = list.items.find(i => i._id === itemId);
        if (!item) return res.status(404).json({ message: "Item not found" });
        req.body = { isBought: !item.isBought };
        return updateItem(req, res, next);
    } catch (err) { next(err); }
}

export async function getInvitations(req: Request, res: Response, next: NextFunction) {
    console.log(`[API] getInvitations for user ${req.user?.id}`);
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ message: 'User not authenticated' });

        const listsWithPendingInvites = await List.find({
            "sharedWith.user": userId,
            "sharedWith.status": "pending"
        })
            .populate('owner', 'username email _id')
            .lean();

        res.json(listsWithPendingInvites);
    } catch (err) { console.error(`[API] getInvitations Error:`, err); next(err); }
}