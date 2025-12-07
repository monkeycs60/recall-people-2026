import { useState } from 'react';
import { contactService } from '@/services/contact.service';
import { Contact, ContactWithDetails, Tag } from '@/types';

export const useContacts = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await contactService.getAll();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  const getContactById = async (id: string): Promise<ContactWithDetails | null> => {
    try {
      return await contactService.getById(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contact');
      return null;
    }
  };

  const createContact = async (data: {
    firstName: string;
    lastName?: string;
    nickname?: string;
    tags?: Tag[];
  }): Promise<Contact> => {
    try {
      const newContact = await contactService.create(data);
      await loadContacts();
      return newContact;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact');
      throw err;
    }
  };

  const updateContact = async (
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      nickname: string;
      tags: Tag[];
      lastContactAt: string;
    }>
  ): Promise<void> => {
    try {
      await contactService.update(id, data);
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update contact');
      throw err;
    }
  };

  const deleteContact = async (id: string): Promise<void> => {
    try {
      await contactService.delete(id);
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete contact');
      throw err;
    }
  };

  return {
    contacts,
    isLoading,
    error,
    loadContacts,
    getContactById,
    createContact,
    updateContact,
    deleteContact,
  };
};
