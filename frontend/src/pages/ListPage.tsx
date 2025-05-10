// File: frontend/src/pages/ListPage.tsx
import React, {
    useEffect,
    useState,
    useCallback,
    useRef,
    Fragment,
  } from 'react';
  import { Link, useNavigate, useParams } from 'react-router-dom';
  import { useTranslation } from 'react-i18next';
  import toast from 'react-hot-toast';
  
  import { useAuth } from '../context/AuthContext';
  import { useListStore } from '../store/listStore';
  
  import AddItemForm from '../components/AddItemForm';
  import ShoppingList from '../components/ShoppingList';
  import ShareListModal from '../components/ShareListModal';
  import MembersDrawer from '../components/MembersDrawer';
  
  import {
    ArrowUturnLeftIcon,
    NoSymbolIcon,
    TrashIcon,
    UserPlusIcon,
    UserGroupIcon,
    WifiIcon,
  } from '@heroicons/react/24/outline';
  
  /* ────────────────────────────────────────────────────────── */
  
  const ListPage: React.FC = () => {
    const { id = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const toggleItemAPI      = useListStore(s => s.toggleItemAPI);
    /* ───── Zustand selectors ───── */
    const currentList           = useListStore(s => s.currentList);
    const isLoadingCurrentList  = useListStore(s => s.isLoadingCurrentList);
    const listError             = useListStore(s => s.error);
    const isConnected           = useListStore(s => s.isConnected);
  
    const fetchListById         = useListStore(s => s.fetchListById);
    const clearCurrentList      = useListStore(s => s.clearCurrentList);
    const leaveListRoom         = useListStore(s => s.leaveListRoom);
  
    const addItemAPI            = useListStore(s => s.addItemAPI);
    const toggleBoughtAPI       = useListStore(s => s.toggleBoughtAPI);
    const removeItemAPI         = useListStore(s => s.removeItemAPI);
    const removeDuplicatesAPI   = useListStore(s => s.removeDuplicatesAPI);
  
    /* ───── UI local state ───── */
    const [showShare,   setShowShare]   = useState(false);
    const [showMembers, setShowMembers] = useState(false);
  
    const navigateRef = useRef(navigate);   // чтобы использовать в cleanup’е
  
    /* ───────────── effects ───────────── */
    useEffect(() => {
      if (id) fetchListById(id).catch(console.error);
      else    navigateRef.current('/');
  
      return () => {
        if (id) leaveListRoom(id);
        clearCurrentList();
      };
    }, [id, fetchListById, leaveListRoom, clearCurrentList]);
  
    /* ───────────── handlers ───────────── */
    const handleRemoveDuplicates = useCallback(async () => {
      if (!currentList?._id) return;
      const toastId = `clean-${currentList._id}`;
      toast.loading(t('listPage.cleaning', 'Cleaning…'), { id: toastId });
      await removeDuplicatesAPI(currentList._id);
      toast.success(t('listPage.cleaned', 'Duplicates removed'), { id: toastId });
    }, [currentList, removeDuplicatesAPI, t]);
  
    /* ───────────── early returns ───────────── */
    if (isLoadingCurrentList || (!currentList && !listError)) {
      return (
        <div className="flex h-[calc(100vh-160px)] items-center justify-center text-gray-500 dark:text-gray-400">
          {t('listPage.loading')}
        </div>
      );
    }
  
    if (listError && !currentList) {
      return (
        <div className="py-10 text-center">
          <p className="mb-4 text-red-500">
            {t('listPage.errorLoading')}: {listError}
          </p>
          <Link to="/" className="btn btn-secondary inline-flex items-center gap-2">
            <ArrowUturnLeftIcon className="h-5 w-5" />
            {t('listPage.backHome')}
          </Link>
        </div>
      );
    }
  
    if (!currentList) {
      return (
        <div className="py-10 text-center text-gray-500 dark:text-gray-400">
          {t('listPage.noList')}
        </div>
      );
    }
  
    /* ───────────── derived data ───────────── */
    const isOwner = user?._id === currentList.owner._id;
    const sharedWithNames = currentList.sharedWith
      ?.map(u => u.username)
      .filter(Boolean)
      .join(', ');
  
    /* ───────────── render ───────────── */
    return (
      <div className="container mx-auto max-w-3xl">
        {/* header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* title & meta */}
          <div className="min-w-0 flex-grow">
            <h1 className="break-words text-3xl font-bold text-gray-800 dark:text-gray-100">
              {currentList.name}
            </h1>
  
            <div className="mt-1 space-x-2 truncate text-xs text-gray-500 dark:text-gray-400">
              <span>
                {t('listPage.owner')}:{' '}
                {isOwner ? t('common.you', 'You') : currentList.owner.username}
              </span>
  
              {sharedWithNames && (
                <span>| {t('listPage.sharedWith')}: {sharedWithNames}</span>
              )}
            </div>
          </div>
  
          {/* actions */}
          <div className="flex flex-shrink-0 items-center space-x-2">
            {/* connection badge */}
            <span
              className={`flex items-center rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
                isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100'
                  : 'animate-pulse bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100'
              }`}
              title={isConnected ? t('listPage.online') : t('listPage.offline')}
            >
              {isConnected ? (
                <WifiIcon className="mr-1 h-4 w-4" />
              ) : (
                <NoSymbolIcon className="mr-1 h-4 w-4" />
              )}
              {isConnected ? t('listPage.online') : t('listPage.offline')}
            </span>
  
            {/* members drawer */}
            {isOwner && (
              <button
                onClick={() => setShowMembers(true)}
                className="btn btn-secondary p-2"
                title={t('members.title')}
              >
                <UserGroupIcon className="h-5 w-5" />
              </button>
            )}
  
            {/* share modal */}
            {isOwner && (
              <button
                onClick={() => setShowShare(true)}
                className="btn bg-blue-500 p-2 text-white hover:bg-blue-600"
                title={t('listPage.shareList')}
              >
                <UserPlusIcon className="h-5 w-5" />
              </button>
            )}
  
            {/* clean duplicates */}
            <button
              onClick={handleRemoveDuplicates}
              className="btn bg-yellow-100 p-2 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-700 dark:text-white dark:hover:bg-yellow-600"
              title={t('homePage.removeDuplicatesTooltip')}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
  
        {/* add‑item form */}
        <div className="mb-6">
          <AddItemForm listId={currentList._id} />
        </div>
  
        {/* items table */}
        <div className="rounded-lg bg-white p-4 shadow dark:bg-gray-800 sm:p-6">
          <ShoppingList
            listId={currentList._id}
            items={currentList.items}
            onToggleItem={toggleBoughtAPI}
            onRemoveItem={removeItemAPI}
          />
        </div>
  
        {/* share modal */}
        {isOwner && (
          <ShareListModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            list={currentList}
          />
        )}
  
        {/* members drawer */}
        {isOwner && showMembers && (
          <MembersDrawer
            list={currentList}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>
    );
  };
  
  export default ListPage;
  