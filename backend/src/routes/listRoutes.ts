import { Router } from 'express';
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

const r = Router();
r.use(protect);

// вернуть все pending приглашения для текущего пользователя
r.get('/invitations', getInvitations);

r.get('/', getAllLists);
r.post('/', createList);

r.get('/:id', getList);
r.patch('/:id/items/:itemId', updateItem);
r.post('/:id/items', addItem);
r.delete('/:id/items/:itemId', deleteItem);
r.delete('/:id', deleteList);
r.patch('/:id/items/:itemId/toggle-bought', toggleBought);

r.post('/:id/share', shareList);
r.put ('/:id/invite/:userId/accept',  respondToInvite);
r.put ('/:id/invite/:userId/decline', respondToInvite);
r.patch('/:id/role/:userId',  changeRole);

// ВАЖНО: этот роут должен быть ДО export default r
r.delete('/:id/share/:userId', removeUserAccess);

export default r;