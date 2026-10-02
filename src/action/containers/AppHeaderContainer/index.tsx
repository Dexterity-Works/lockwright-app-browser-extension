import { AUTHENTICATOR_ENABLED } from 'lockwright-lib-constants'
import { useUserData, useVault, useVaults } from 'lockwright-lib-vault'

import { AddItemContextMenu } from '../AddItemContextMenu'
import { AppHeaderAddItemTrigger, AppHeader } from '../AppHeader'
import { ImportItemOrVaultModalContent } from '../../../shared/containers/ImportItemOrVaultModalContent'
import { useAppHeaderContext } from '../../../shared/context/AppHeaderContext'
import { useModal } from '../../../shared/context/ModalContext'
import { useRouter } from '../../../shared/context/RouterContext'
import { useRecordMenuItems } from '../../../shared/hooks/useRecordMenuItems'
import { isFavorite } from '../../../shared/utils/isFavorite'
import { useCreateOrEditRecord } from '../../hooks/useCreateOrEditRecord'

export const AppHeaderContainer = () => {
  const { currentPage, state: routerState } = useRouter() as {
    currentPage: string
    state: { recordType?: string; folder?: string } | undefined
  }
  const {
    searchValue,
    setSearchValue,
    isAddMenuOpen,
    setIsAddMenuOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed
  } = useAppHeaderContext()
  const { setModal } = useModal()
  const { defaultItems } = useRecordMenuItems()
  const { handleCreateOrEditRecord } = useCreateOrEditRecord()

  const { refetch: refetchVault } = useVault()
  const { refetch: refetchMasterVault } = useVaults()
  const { refetch: refetchUserData } = useUserData()

  if (
    currentPage !== 'vault' &&
    !(AUTHENTICATOR_ENABLED && currentPage === 'authenticator')
  ) {
    return null
  }

  const isFavoritesView = isFavorite(routerState?.folder ?? '')
  const selectedFolder =
    routerState?.folder && !isFavoritesView ? routerState.folder : undefined

  // A sidebar category picks the type, so + skips the type menu.
  const selectedRecordType =
    currentPage === 'vault'
      ? defaultItems.find((item) => item.type === routerState?.recordType)?.type
      : undefined

  const onSavedForOtp =
    AUTHENTICATOR_ENABLED && currentPage === 'authenticator'
      ? async () => {
          await Promise.all([
            refetchUserData(),
            refetchMasterVault(),
            refetchVault()
          ])
        }
      : undefined

  const handleImportClick = () => {
    setModal(<ImportItemOrVaultModalContent />)
  }

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed((value) => !value)
  }

  const addItemControl = selectedRecordType ? (
    <AppHeaderAddItemTrigger
      testID="main-plus-button"
      onClick={() =>
        handleCreateOrEditRecord({
          recordType: selectedRecordType,
          selectedFolder,
          isFavorite: isFavoritesView || undefined
        })
      }
    />
  ) : (
    <AddItemContextMenu
      isOpen={isAddMenuOpen}
      onOpenChange={setIsAddMenuOpen}
      selectedFolder={selectedFolder}
      isFavoritesView={isFavoritesView}
      onSavedForOtp={onSavedForOtp}
      testID="app-header-add-menu"
      trigger={
        <AppHeaderAddItemTrigger
          testID="main-plus-button"
          onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
        />
      }
    />
  )

  return (
    <AppHeader
      searchValue={searchValue}
      onSearchChange={(val) => setSearchValue(val)}
      onImportClick={handleImportClick}
      onSidebarToggle={handleSidebarToggle}
      isSidebarCollapsed={isSidebarCollapsed}
      addItemControl={addItemControl}
      searchTestID="main-search-input"
      importTestID="main-import-button"
    />
  )
}
