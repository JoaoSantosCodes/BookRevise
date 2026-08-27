import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("books authorization", () => {
  it("rejects the private library without an authenticated user", async () => {
    const ctx = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    } satisfies TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.books.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
