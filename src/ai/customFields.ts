import type { CustomProductField } from '../types';

/** Excel validation lists are commonly pasted as tab-delimited text. */
export function parsePresetValues(value: string): string[] {
  return [...new Set(
    value
      .split(/\t+|\r?\n+| {2,}/)
      .map((option) => option.trim())
      .filter(Boolean),
  )];
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function genericPreset(options: string[]): string {
  const genericTerms =
    /^(other|standard|basic|universal|general(?: purpose)?|multi[- ]purpose|not applicable|n\/?a|none|unspecified|miscellaneous)$/i;
  return options.find((option) => genericTerms.test(option.trim())) ?? options[0];
}

/** Guarantee one allowed, non-empty value for each configured custom field. */
export function completeCustomFieldAnswers(
  configuredFields: CustomProductField[] = [],
  answers: Array<{ fieldName: string; value: string }> = [],
): Array<{ fieldName: string; value: string }> {
  return configuredFields
    .map((field) => {
      const fieldName = field.fieldName.trim();
      const options = parsePresetValues(field.presetValue);
      if (!fieldName || !options.length) return null;
      const answer = answers.find(
        (item) => normalize(item.fieldName) === normalize(fieldName),
      );
      const value = options.find(
        (option) => normalize(option) === normalize(answer?.value ?? ''),
      );
      return { fieldName, value: value ?? genericPreset(options) };
    })
    .filter((item): item is { fieldName: string; value: string } => item !== null);
}
