import { describe, it, expect } from "vite-plus/test";
import { handleTrigger } from "./trigger";

describe("handleTrigger", () => {
  it("returns 503 when no expected token is configured", () => {
    let fired = false;
    const res = handleTrigger({
      expectedToken: undefined,
      providedToken: "anything",
      trigger: () => {
        fired = true;
      },
    });
    expect(res.status).toBe(503);
    expect(fired).toBe(false);
  });

  it("returns 401 when the provided token does not match", () => {
    let fired = false;
    const res = handleTrigger({
      expectedToken: "secret",
      providedToken: "wrong",
      trigger: () => {
        fired = true;
      },
    });
    expect(res.status).toBe(401);
    expect(fired).toBe(false);
  });

  it("returns 401 when no token is provided", () => {
    let fired = false;
    const res = handleTrigger({
      expectedToken: "secret",
      providedToken: null,
      trigger: () => {
        fired = true;
      },
    });
    expect(res.status).toBe(401);
    expect(fired).toBe(false);
  });

  it("fires the trigger and returns 202 when the token matches", () => {
    let fired = false;
    const res = handleTrigger({
      expectedToken: "secret",
      providedToken: "secret",
      trigger: () => {
        fired = true;
      },
    });
    expect(res.status).toBe(202);
    expect(fired).toBe(true);
  });
});
