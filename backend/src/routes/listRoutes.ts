// File: C:\Users\galym\Desktop\ShopSmart\backend\src\routes\listRoutes.ts
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
  removeDuplicates
} from '../controllers/listController'; // Все контроллеры импортируются отсюда
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
router.use(protect); // Защищаем все маршруты ниже

// --- Основные маршруты для списков ---
router.get('/', getAllLists);
router.post('/', createList);

// --- Маршруты для конкретного списка ---
router.route('/:id')
  .get(getList)
  .delete(deleteList);

// --- Маршруты для элементов внутри списка ---
router.post('/:id/items', addItem); // POST для создания нового элемента

router.route('/:id/items/:itemId')
  .patch(updateItem) // PATCH для частичного обновления элемента
  .delete(deleteItem); // DELETE для удаления элемента

// Маршрут для toggleBought (если используется отдельно)
router.patch('/:id/items/:itemId/toggle-bought', toggleBought);

// --- Маршруты для шейринга ---
router.post('/:id/share', shareList); // Пригласить пользователя
router.delete('/:id/share/:userId', removeUserAccess); // Удалить доступ пользователя (userId - кого удаляем)

// --- Маршруты для обработки приглашений (пока заглушки) ---
// userId здесь - это ID ТЕКУЩЕГО пользователя, который принимает/отклоняет
router.put ('/:id/invite/:userId/accept',  respondToInvite);
router.put ('/:id/invite/:userId/decline', respondToInvite);

// --- Маршрут для изменения роли (пока заглушка) ---
// userId здесь - ID пользователя в списке, чью роль меняет владелец
router.patch('/:id/role/:userId',  changeRole);

// --- Маршрут для получения приглашений (пока заглушка) ---
router.get('/invitations', getInvitations); // Это GET, а не POST

// --- Маршрут для удаления дубликатов ---
router.post('/:id/remove-duplicates', removeDuplicates);

export default router;