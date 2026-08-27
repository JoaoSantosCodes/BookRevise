import { describe, expect, it } from "vitest";
import { DEFAULT_SHORTCUTS, hasShortcutConflict } from "./VersionHistoryPanel";

describe("VersionHistoryPanel shortcut preferences", () => {
  it("exposes the editorial diff defaults", () => {
    expect(DEFAULT_SHORTCUTS).toEqual({
      previous: "ArrowLeft",
      next: "ArrowRight",
      first: "Home",
      last: "End",
    });
  });

  it("detects duplicate shortcuts before persistence", () => {
    expect(hasShortcutConflict(DEFAULT_SHORTCUTS)).toBe(false);
    expect(
      hasShortcutConflict({
        ...DEFAULT_SHORTCUTS,
        next: "ArrowLeft",
      }),
    ).toBe(true);
  });
});
