export const CONTACT_REMINDER_NEVER_DAYS = -1;
export const ACCOUNT_REMINDER_NEVER_DAYS = 0;
export const REMINDER_FREQUENCY_PRESETS = [7, 14, 30, 60, 90, 180, 365] as const;
export const ACCOUNT_REMINDER_FREQUENCY_OPTIONS = [
  ...REMINDER_FREQUENCY_PRESETS,
  ACCOUNT_REMINDER_NEVER_DAYS,
] as const;

type StaleContactReminderFilter = {
  whereSql: string;
  params: number[];
};

export const getEffectiveReminderFrequencyDays = (
  contactReminderFrequencyDays: number | null | undefined,
  accountDefaultDays: number
): number => {
  if (contactReminderFrequencyDays === CONTACT_REMINDER_NEVER_DAYS) {
    return CONTACT_REMINDER_NEVER_DAYS;
  }

  if (contactReminderFrequencyDays && contactReminderFrequencyDays > 0) {
    return contactReminderFrequencyDays;
  }

  if (accountDefaultDays === ACCOUNT_REMINDER_NEVER_DAYS) {
    return CONTACT_REMINDER_NEVER_DAYS;
  }

  return accountDefaultDays;
};

export const buildStaleContactReminderFilter = (
  accountDefaultDays: number
): StaleContactReminderFilter => {
  const explicitContactReminderSql =
    "(reminder_frequency_days IS NOT NULL AND reminder_frequency_days > 0 AND julianday('now') - julianday(last_contact_at) >= reminder_frequency_days)";

  if (accountDefaultDays === ACCOUNT_REMINDER_NEVER_DAYS) {
    return {
      whereSql: explicitContactReminderSql,
      params: [],
    };
  }

  return {
    whereSql: `(${explicitContactReminderSql} OR (reminder_frequency_days IS NULL AND julianday('now') - julianday(last_contact_at) >= ?))`,
    params: [accountDefaultDays],
  };
};
