import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const forced = [...css.matchAll(/@media \(forced-colors: active\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join("\n");

describe("forced colors", () => {
  it("draws the chosen-lane tick in system colours, not the white SVG on a dropped fill", () => {
    expect(forced).toMatch(/\.as-check input:checked \+ span \{[^}]*forced-color-adjust: none;[^}]*background: Highlight;/);
    expect(forced).toMatch(/\.as-check input:checked \+ span::after \{[^}]*border: solid HighlightText;/);
    expect(forced).toMatch(/\.as-check span \{[^}]*border-color: ButtonText;/);
  });
});
