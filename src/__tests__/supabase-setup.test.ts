import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("Supabase installation source", () => {
  it("keeps the combined installer identical to the tested migrations", () => {
    expect(() => execFileSync(process.execPath, [
      "scripts/build-supabase-setup.mjs", "--check",
    ], { stdio: "pipe" })).not.toThrow();
  });
});
