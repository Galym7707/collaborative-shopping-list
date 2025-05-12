// File: frontend/src/pages/ListPage.tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useListStore } from '@/store/listStore';
import AddItemForm from '@/components/AddItemForm';
import ShoppingList from '@/components/ShoppingList';
import ShareListModal from '@/components/ShareListModal';
import toast from 'react-hot-toast';

const ListPage: React.FC = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const {
    currentList,
    isLoadingList,
    error,
    fetchListById,
    addItem,
    toggleItem,
    deleteItem,
    removeDuplicates,
  } = useListStore(state => ({
    currentList: state.currentList,
    isLoadingList: state.isLoadingList,
    error: state.error,
    fetchListById: state.fetchListById,
    addItem: state.addItem,
    toggleItem: state.toggleItem,
    deleteItem: state.deleteItem,
    removeDuplicates: state.removeDuplicates,
  }));

  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);

  useEffect(() => {
    if (listId) {
      fetchListById(listId);
    }
  }, [listId, fetchListById]);

  const handleToggleItem = async (itemId: string, currentIsBought: boolean) => {
    if (!listId) return;
    try {
      await toggleItem(listId, itemId, currentIsBought);
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle item');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!listId) return;
    try {
      await deleteItem(listId, itemId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove item');
    }
  };

  const handleRemoveDuplicates = async () => {
    if (!listId) return;
    try {
      await removeDuplicates(listId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove duplicates');
    }
  };

  if (isLoadingList) {
    return <div>Loading list...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!currentList || currentList._id !== listId) {
    return <div>List not found</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{currentList.name}</h1>
      <button
        onClick={() => setIsShareModalOpen(true)}
        className="mb-4 bg-blue-600 text-white rounded-md py-2 px-4 hover:bg-blue-700"
      >
        Share List
      </button>
      <button
        onClick={handleRemoveDuplicates}
        className="mb-4 ml-2 bg-green-600 text-white rounded-md py-2 px-4 hover:bg-green-700"
      >
        Remove Duplicates
      </button>
      <AddItemForm listId={listId!} />
      <ShoppingList
        listId={listId!}
        items={currentList.items}
        onToggleItem={handleToggleItem}
        onRemoveItem={handleRemoveItem}
      />
      <ShareListModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        list={currentList}
      />
    </div>
  );
};

export default ListPage;