import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { contactService } from '@/services/contact.service';
import { Contact, ContactWithDetails, Gender } from '@/types';

type ContactsState = {
  contacts: Contact[];
  isLoading: boolean;
  isInitialized: boolean;
};

type ContactsActions = {
  loadContacts: () => Promise<void>;
  getContactById: (id: string) => Promise<ContactWithDetails | null>;
  createContact: (data: {
    firstName: string;
    lastName?: string;
    nickname?: string;
    gender?: Gender;
  }) => Promise<Contact>;
  updateContact: (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nickname: string;
      highlights: string[];
      lastContactAt: string;
    }>
  ) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  findContactsByFirstName: (firstName: string) => Contact[];
};

export const useContactsStore = create<ContactsState & ContactsActions>()(
  devtools(
    (set, get) => ({
      contacts: [],
      isLoading: false,
      isInitialized: false,

      loadContacts: async () => {
        set({ isLoading: true });
        try {
          const data = await contactService.getAll();
          set({ contacts: data, isLoading: false, isInitialized: true });
        } catch (error) {
          console.error('Failed to load contacts:', error);
          set({ isLoading: false, isInitialized: true });
        }
      },

      getContactById: async (id: string) => {
        try {
          return await contactService.getById(id);
        } catch (error) {
          console.error('Failed to get contact:', error);
          return null;
        }
      },

      createContact: async (data) => {
        const newContact = await contactService.create(data);
        await get().loadContacts();
        return newContact;
      },

      updateContact: async (id, data) => {
        await contactService.update(id, data);
        await get().loadContacts();
      },

      deleteContact: async (id) => {
        await contactService.delete(id);
        await get().loadContacts();
      },

      findContactsByFirstName: (firstName: string) => {
        const normalizedName = firstName.toLowerCase().trim();
        return get().contacts.filter(
          (contact) => contact.firstName.toLowerCase().trim() === normalizedName
        );
      },
    }),
    { name: 'contacts-store' }
  )
);
