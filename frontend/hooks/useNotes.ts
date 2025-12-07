import { noteService } from '@/services/note.service';
import { Note } from '@/types';

export const useNotes = () => {
  const getNotesByContact = async (contactId: string): Promise<Note[]> => {
    return await noteService.getByContact(contactId);
  };

  const createNote = async (data: {
    contactId: string;
    audioUri?: string;
    audioDurationMs?: number;
    transcription?: string;
    summary?: string;
  }): Promise<Note> => {
    return await noteService.create(data);
  };

  const deleteNote = async (id: string): Promise<void> => {
    await noteService.delete(id);
  };

  return {
    getNotesByContact,
    createNote,
    deleteNote,
  };
};
