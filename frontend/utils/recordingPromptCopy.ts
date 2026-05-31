export type RecordingPromptContext = 'general' | 'contact';

export type TextInputPlaceholderKeys = {
  intro: string;
  primary: string;
  secondary: string;
  upcoming: string;
};

const generalTextInputPlaceholderKeys: TextInputPlaceholderKeys = {
  intro: 'textInput.placeholderIntro',
  primary: 'textInput.placeholderBulletName',
  secondary: 'textInput.placeholderBulletLikes',
  upcoming: 'textInput.placeholderBulletUpcoming',
};

const contactTextInputPlaceholderKeys: TextInputPlaceholderKeys = {
  intro: 'textInput.placeholderIntroWithContact',
  primary: 'textInput.placeholderBulletContactMoment',
  secondary: 'textInput.placeholderBulletContactDetail',
  upcoming: 'textInput.placeholderBulletContactUpcoming',
};

export function getRecordingLimitMinutes(maxRecordingDurationSeconds: number): number {
  if (!Number.isFinite(maxRecordingDurationSeconds) || maxRecordingDurationSeconds <= 0) {
    return 1;
  }

  return Math.ceil(maxRecordingDurationSeconds / 60);
}

export function getTextInputPlaceholderKeys(
  context: RecordingPromptContext
): TextInputPlaceholderKeys {
  return context === 'contact'
    ? contactTextInputPlaceholderKeys
    : generalTextInputPlaceholderKeys;
}
