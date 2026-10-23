import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("home page", () => {
  it("renders the bench in demo mode with the prompt limit and the demo notice", () => {
    const html = renderToString(<Home />);
    expect(html).toContain("Compare the same thought across the stack.");
    expect(html).toContain("Demo bench");
    expect(html).toMatch(/0(<!-- -->)? \/ (<!-- -->)?4000(<!-- -->)? characters/);
    expect(html).toContain("<strong>Demo mode.</strong> Lanes return labelled sample text and no model is called.");
  });
});
