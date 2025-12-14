import { useContactsStore } from '@/stores/contacts-store';

export const useContacts = () => {
  const store = useContactsStore();

  return {
    contacts: store.contacts,
    isLoading: store.isLoading,
    error: null,
    loadContacts: store.loadContacts,
    getContactById: store.getContactById,
    createContact: store.createContact,
    updateContact: store.updateContact,
    deleteContact: store.deleteContact,
  };
};
