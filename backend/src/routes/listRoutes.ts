import express from 'express';
import {
  getAllLists,
  createList,
  getList,
  addItem,
  updateItem,
  deleteItem,
  shareList,
  deleteList,
  respondToInvite,
  changeRole,
  toggleBought,
  removeUserAccess,
  getInvitations,
} from '../controllers/listController';
import { protect } from '../middleware/authMiddleware';
import List, { IList, IListItem } from '../models/List';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

const router = express.Router();
router.use(protect);

// вернуть все pending приглашения для текущего пользователя
router.get('/invitations', getInvitations);

router.get('/', getAllLists);
router.post('/', createList);

router.get('/:id', getList);
router.patch('/:id/items/:itemId', updateItem);
router.post('/:id/items', addItem);
router.delete('/:id/items/:itemId', deleteItem);
router.delete('/:id', deleteList);
router.patch('/:id/items/:itemId/toggle-bought', toggleBought);

router.post('/:id/share', shareList);
router.put ('/:id/invite/:userId/accept',  respondToInvite);
router.put ('/:id/invite/:userId/decline', respondToInvite);
router.patch('/:id/role/:userId',  changeRole);

// ВАЖНО: этот роут должен быть ДО export default router
router.delete('/:id/share/:userId', removeUserAccess);

export default router;

export async function shareList(req: Request, res: Response, next: NextFunction) {
    const listId = req.params.id;
    const { email } = req.body;
    try {
        const ownerId = req.user?._id;
        if (!email || typeof email !== 'string') return res.status(400).json({ message: 'Valid email required' });
        if (!ownerId) return res.status(401).json({ message: 'User not authenticated' });

        const list = await List.findById(listId);
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (!list.owner.equals(ownerId)) return res.status(403).json({ message: 'Only owner can share' });

        const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userToInvite) return res.status(404).json({ message: 'User with this email not found' });
        if (userToInvite._id.equals(ownerId)) return res.status(400).json({ message: 'Cannot share list with yourself' });
        if (list.sharedWith.some(id => id.equals(userToInvite._id))) return res.status(400).json({ message: 'List already shared with this user' });

        list.sharedWith.push(userToInvite._id as mongoose.Types.ObjectId);
        await list.save();

        const populatedList = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id')
            .lean();

        const io = (req as any).io;
        if (io && populatedList && userToInvite) {
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            io.to(`user_${userToInvite._id}`).emit('listSharedWithYou', populatedList);
        }
        res.status(200).json({ message: `List shared with ${userToInvite.username}`, list: populatedList });
    } catch (error) { next(error); }
}

export async function removeUserAccess(req: Request, res: Response, next: NextFunction) {
    const { id: listId, userId: userIdToRemove } = req.params;
    try {
        const ownerId = req.user?._id;
        if (!mongoose.Types.ObjectId.isValid(userIdToRemove)) return res.status(400).json({ message: 'Invalid userId' });
        if (!ownerId) return res.status(401).json({ message: 'User not authenticated' });

        const list = await List.findById(listId);
        if (!list) return res.status(404).json({ message: 'List not found' });
        if (!list.owner.equals(ownerId)) return res.status(403).json({ message: 'Only owner can remove access' });

        const userObjectIdToRemove = new mongoose.Types.ObjectId(userIdToRemove);
        const initialLength = list.sharedWith.length;
        list.sharedWith = list.sharedWith.filter(id => !id.equals(userObjectIdToRemove));

        if (list.sharedWith.length === initialLength) return res.status(404).json({ message: 'User not found in shared list' });

        await list.save();

        const populatedList = await List.findById(listId)
            .populate('owner', 'username email _id')
            .populate('sharedWith', 'username email _id')
            .lean();

        const io = (req as any).io;
        if (io && populatedList) {
            io.to(`list_${listId}`).emit('listUpdate', populatedList);
            io.to(`user_${userIdToRemove}`).emit('listAccessRemoved', { listId });
        }
        res.status(200).json({ message: 'User access removed', list: populatedList });
    } catch (error) { next(error); }
}