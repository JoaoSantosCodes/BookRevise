import { describe, expect, it } from "vitest";
import { DEFAULT_SHORTCUTS, getDiffPage, hasShortcutConflict } from "./versionHistoryUtils";

describe("VersionHistoryPanel shortcut preferences", () => {
  it("exposes the editorial diff defaults", () => {
    expect(DEFAULT_SHORTCUTS).toEqual({ previous: "ArrowLeft", next: "ArrowRight", first: "Home", last: "End" });
  });

  it("detects duplicate shortcuts before persistence", () => {
    expect(hasShortcutConflict(DEFAULT_SHORTCUTS)).toBe(false);
    expect(hasShortcutConflict({ ...DEFAULT_SHORTCUTS, next: "ArrowLeft" })).toBe(true);
  });
});

describe("diff pagination", () => {
  it("renders fixed-size pages and clamps invalid page indexes", () => {
    const segments = Array.from({ length: 241 }, (_, index) => index);
    expect(getDiffPage(segments, 0).items).toHaveLength(120);
    expect(getDiffPage(segments, 1).items[0]).toBe(120);
    expect(getDiffPage(segments, 2).items).toHaveLength(1);
    expect(getDiffPage(segments, 99).page).toBe(2);
    expect(getDiffPage(segments, -1).page).toBe(0);
  });
});
