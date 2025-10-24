import { Client, Account, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);

export const DATABASE_ID = '68fb7cdb000872ae40b9';
export const CHATS_COLLECTION_ID = 'chats2025';
export const MESSAGES_COLLECTION_ID = 'messages2025';

export { ID } from 'appwrite';
