import { describe, expect, it } from "vitest";
import { cloneDocument, HistoryManager, type HistoryEntry } from "./history-manager";
import { createBlankDocument } from "../document/factories";

function entry(label: string, name: string, coalesceKey?: string): HistoryEntry {
  const document = createBlankDocument();
  document.name = name;
  return { label, coalesceKey, document: cloneDocument(document), pixels: {} };
}

describe("HistoryManager", () => {
  it("undoes and redoes in order", () => {
    const history = new HistoryManager();
    history.record(entry("A", "one"));
    history.record(entry("B", "two"));

    const undone = history.undo(entry("now", "three"));
    expect(undone?.document.name).toBe("two");
    expect(history.canRedo).toBe(true);

    const redone = history.redo(entry("after-undo", "one"));
    expect(redone?.document.name).toBe("three");
  });

  it("coalesces rapid matching gestures into one undo step", () => {
    const history = new HistoryManager();
    history.record(entry("Move", "a", "move:layer-1"));
    history.record(entry("Move", "b", "move:layer-1"));
    history.record(entry("Move", "c", "move:layer-1"));
    expect(history.canUndo).toBe(true);
    history.undo(entry("now", "d"));
    expect(history.canUndo).toBe(false);
  });

  it("clears redo after a new edit", () => {
    const history = new HistoryManager();
    history.record(entry("A", "one"));
    history.undo(entry("now", "two"));
    history.record(entry("B", "branch"));
    expect(history.canRedo).toBe(false);
  });
});
