import { describe, it, expect } from "vitest";
import { GandiError } from "../../src/gandi/errors.js";

describe("GandiError.toUserMessage", () => {
  it("maps 401 to an api-key actionable message", () => {
    const err = new GandiError(401, "Unauthorized");
    expect(err.toUserMessage()).toMatch(/Gandi rejected the API key/);
    expect(err.toUserMessage()).toMatch(/~\/.gandi-mcp\/config\.json/);
  });

  it("maps 403 to a permission message", () => {
    const err = new GandiError(403, "Forbidden");
    expect(err.toUserMessage()).toMatch(/lacks permission/);
  });

  it("maps 404 with the detail string as the resource hint", () => {
    const err = new GandiError(404, "record not found");
    expect(err.toUserMessage()).toMatch(/Not found: record not found/);
  });

  it("returns Gandi's own detail for 409", () => {
    const err = new GandiError(409, "record already exists");
    expect(err.toUserMessage()).toBe("record already exists");
  });

  it("maps 429 to a rate limit message", () => {
    const err = new GandiError(429, "Too Many Requests");
    expect(err.toUserMessage()).toMatch(/Rate limited by Gandi/);
  });

  it("maps 5xx to a retry message with the status", () => {
    const err = new GandiError(502, "Bad Gateway");
    expect(err.toUserMessage()).toMatch(/Gandi server error \(502\)/);
  });

  it("falls back to the raw detail for other statuses", () => {
    const err = new GandiError(418, "I'm a teapot");
    expect(err.toUserMessage()).toBe("I'm a teapot");
  });
});
