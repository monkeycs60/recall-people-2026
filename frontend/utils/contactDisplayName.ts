import { Contact } from '@/types';

type ContactLike = Pick<Contact, 'firstName' | 'lastName' | 'nickname'>;

export function getContactDisplayName(contact: ContactLike): string {
  if (contact.lastName) {
    return `${contact.firstName} ${contact.lastName}`;
  }
  if (contact.nickname) {
    return `${contact.firstName} ${contact.nickname}`;
  }
  return contact.firstName;
}

export function getContactInitials(contact: ContactLike): string {
  const first = contact.firstName.charAt(0).toUpperCase();
  if (contact.lastName) {
    return first + contact.lastName.charAt(0).toUpperCase();
  }
  return first;
}
