/**
 * Pure interface preference logic.
 * Only two practical display switches exist. Anything damaged
 * in storage falls back to the defaults.
 */
export const THEMES = ['light', 'dark'];

export const DEFAULT_INTERFACE_PREFERENCES = {
  targetCursor: true,
  animations: true,
  theme: 'light',
  pageTransitionsEnabled: true,
};

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeInterfacePreferences(raw) {
  const source = isPlainObject(raw) ? raw : {};
  return {
    targetCursor:
      typeof source.targetCursor === 'boolean'
        ? source.targetCursor
        : DEFAULT_INTERFACE_PREFERENCES.targetCursor,
    animations:
      typeof source.animations === 'boolean'
        ? source.animations
        : DEFAULT_INTERFACE_PREFERENCES.animations,
    theme: THEMES.includes(source.theme) ? source.theme : DEFAULT_INTERFACE_PREFERENCES.theme,
    pageTransitionsEnabled:
      typeof source.pageTransitionsEnabled === 'boolean'
        ? source.pageTransitionsEnabled
        : DEFAULT_INTERFACE_PREFERENCES.pageTransitionsEnabled,
  };
}
