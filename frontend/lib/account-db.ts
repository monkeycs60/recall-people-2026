export const LEGACY_DATABASE_NAME = 'recall_people.db';
export const E2E_LEGACY_DATABASE_NAME = 'recall_people_test.db';

const hashUserId = (userId: string): string => {
  let hash = 5381;
  for (let index = 0; index < userId.length; index += 1) {
    hash = ((hash << 5) + hash) ^ userId.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const getAccountDatabaseName = (userId: string, isE2ETest = false): string => {
  const screenshotDbHash = process.env.EXPO_PUBLIC_SCREENSHOT_DB_HASH;
  if (!isE2ETest && screenshotDbHash && /^[a-f0-9]{8}$/i.test(screenshotDbHash)) {
    return `recall_people_${screenshotDbHash.toLowerCase()}.db`;
  }

  const prefix = isE2ETest ? 'recall_people_test' : 'recall_people';
  return `${prefix}_${hashUserId(userId)}.db`;
};
