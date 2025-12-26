import { Contact } from '@/types';

type ContactLike = Pick<Contact, 'firstName' | 'lastName' | 'nickname'>;

function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function capitalizeFullName(name: string): string {
  return name.split(' ').map(capitalizeWord).join(' ');
}

export function getContactDisplayName(contact: ContactLike): string {
  const firstName = capitalizeWord(contact.firstName);

  if (contact.lastName) {
    return `${firstName} ${capitalizeFullName(contact.lastName)}`;
  }
  if (contact.nickname) {
    return `${firstName} ${capitalizeWord(contact.nickname)}`;
  }
  return firstName;
}

export function getContactInitials(contact: ContactLike): string {
  const first = contact.firstName.charAt(0).toUpperCase();
  if (contact.lastName) {
    return first + contact.lastName.charAt(0).toUpperCase();
  }
  return first;
}
