export type ThemeId = 'nordic-slate' | 'cyber-dark' | 'forest-muted' | 'vibrant-pop';

export const themes: Array<{ id: ThemeId; label: string; color: string; foreground: string }> = [
  { id: 'nordic-slate', label: 'Nordic Slate', color: '#3e517a', foreground: '#ffffff' },
  { id: 'cyber-dark', label: 'Cyber Dark', color: '#6366f1', foreground: '#ffffff' },
  { id: 'forest-muted', label: 'Forest Muted', color: '#4a5d4e', foreground: '#ffffff' },
  { id: 'vibrant-pop', label: 'Vibrant Pop', color: '#ff5a36', foreground: '#ffffff' },
];

export const defaultTheme: ThemeId = 'forest-muted';

export function isThemeId(value: unknown): value is ThemeId {
  return themes.some(theme => theme.id === value);
}
