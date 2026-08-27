export type Shortcuts = { previous: string; next: string; first: string; last: string };

export const DEFAULT_SHORTCUTS: Shortcuts = { previous: "ArrowLeft", next: "ArrowRight", first: "Home", last: "End" };

export function hasShortcutConflict(shortcuts: Shortcuts) {
  const values = Object.values(shortcuts);
  return new Set(values).size !== values.length;
}

export function getDiffPage<T>(segments: T[], page: number, pageSize = 120) {
  const totalPages = Math.max(1, Math.ceil(segments.length / pageSize));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  return { page: safePage, totalPages, items: segments.slice(safePage * pageSize, (safePage + 1) * pageSize) };
}
