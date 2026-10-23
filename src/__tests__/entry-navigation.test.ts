import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}));

import { middleware } from "@/middleware";
import { updateSession } from "@/lib/supabase/middleware";

describe("profile entry navigation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects the root before rendering the profile selection", async () => {
    const response = await middleware(new NextRequest("https://memoria.example/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://memoria.example/today");
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("preserves query parameters when entering from a shared link", async () => {
    const response = await middleware(
      new NextRequest("https://memoria.example/?source=homescreen&day=2026-10-23"),
    );

    expect(response.headers.get("location")).toBe(
      "https://memoria.example/today?source=homescreen&day=2026-10-23",
    );
  });

  it.each(["/today", "/settings", "/together/plan?day=2026-10-23", "/api/data"])(
    "keeps session handling and avoids redirect loops for %s",
    async (path) => {
      const request = new NextRequest(`https://memoria.example${path}`);
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
      expect(updateSession).toHaveBeenCalledWith(request);
    },
  );
});
