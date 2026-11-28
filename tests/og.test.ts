import { describe, expect, it, vi } from "vitest";
import { isShareableOrigin, OG_IMAGE, SOCIAL_CARD } from "@/lib/site";
import { metadata } from "@/app/layout";

vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "font" }) }));

describe("social card", () => {
  it("announces the 1200x630 card only for a public https origin", () => {
    expect(isShareableOrigin("https://example.com")).toBe(true);
    expect(isShareableOrigin("http://example.com")).toBe(false);
    expect(isShareableOrigin("https://localhost:3000")).toBe(false);
    expect(isShareableOrigin("https://127.0.0.1")).toBe(false);
    expect(OG_IMAGE).toMatchObject({ url: "/og.png", width: 1200, height: 630 });
  });

  it("puts the card on the root metadata that every page inherits", () => {
    expect(metadata.openGraph).toMatchObject(SOCIAL_CARD.openGraph);
    expect(metadata.twitter).toMatchObject(SOCIAL_CARD.twitter);
    // Pages fall back to their own Open Graph title for the X card only when the root sets no twitter title.
    expect(metadata.twitter).not.toHaveProperty("title");
    expect(metadata.twitter).not.toHaveProperty("description");
  });
});
