import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GandiClient } from "../../src/gandi/client.js";
import { GandiError } from "../../src/gandi/errors.js";

function mockFetch(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("GandiClient", () => {
  beforeEach(() => {});
  afterEach(() => vi.unstubAllGlobals());

  it("attaches a bearer auth header on GET", async () => {
    const fetchMock = mockFetch(() => new Response(JSON.stringify([]), { status: 200 }));
    const client = new GandiClient("TEST_KEY");
    await client.listDomains();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer TEST_KEY");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("sends JSON body on addRecord", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 201 }));
    const client = new GandiClient("K");
    await client.addRecord("ex.com", { name: "www", type: "A", values: ["1.2.3.4"], ttl: 300 });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.gandi.net/v5/livedns/domains/ex.com/records");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      rrset_name: "www",
      rrset_type: "A",
      rrset_values: ["1.2.3.4"],
      rrset_ttl: 300,
    });
  });

  it("defaults ttl to 300 when omitted", async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 201 }));
    const client = new GandiClient("K");
    await client.addRecord("ex.com", { name: "www", type: "A", values: ["1.2.3.4"] });
    const body = JSON.parse(fetchMock.mock.calls[0]![1]?.body as string);
    expect(body.rrset_ttl).toBe(300);
  });

  it("maps non-2xx to GandiError with status and detail", async () => {
    mockFetch(() => new Response(JSON.stringify({ message: "record not found" }), { status: 404 }));
    const client = new GandiClient("K");
    await expect(client.getRecord("ex.com", "nope", "A")).rejects.toMatchObject({
      status: 404,
      detail: "record not found",
    });
  });

  it("uses statusText as detail when body has no message", async () => {
    mockFetch(() => new Response("", { status: 500, statusText: "Internal Server Error" }));
    const client = new GandiClient("K");
    await expect(client.listDomains()).rejects.toMatchObject({
      status: 500,
      detail: "Internal Server Error",
    });
  });

  it("treats 204 as void", async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    const client = new GandiClient("K");
    const result = await client.deleteRecord("ex.com", "www", "A");
    expect(result).toBeUndefined();
  });

  it("createSnapshot POSTs to /snapshots with optional name", async () => {
    const fetchMock = mockFetch(() =>
      new Response(JSON.stringify({ id: "abc", created_at: "2026-04-24T00:00:00Z" }), { status: 201 }),
    );
    const client = new GandiClient("K");
    const snap = await client.createSnapshot("ex.com", "pre-change");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.gandi.net/v5/livedns/domains/ex.com/snapshots");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ name: "pre-change" });
    expect(snap.id).toBe("abc");
  });

  it("createSnapshot sends empty body when name omitted", async () => {
    const fetchMock = mockFetch(() =>
      new Response(JSON.stringify({ id: "abc", created_at: "2026-04-24T00:00:00Z" }), { status: 201 }),
    );
    const client = new GandiClient("K");
    await client.createSnapshot("ex.com");
    const body = fetchMock.mock.calls[0]![1]?.body as string | undefined;
    expect(body === undefined || !(JSON.parse(body) as Record<string, unknown>).name).toBe(true);
  });

  it("listSnapshots GETs /snapshots", async () => {
    const fetchMock = mockFetch(() =>
      new Response(JSON.stringify([{ id: "a", created_at: "x" }, { id: "b", created_at: "y" }]), {
        status: 200,
      }),
    );
    const client = new GandiClient("K");
    const snaps = await client.listSnapshots("ex.com");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.gandi.net/v5/livedns/domains/ex.com/snapshots");
    expect(init?.method ?? "GET").toBe("GET");
    expect(snaps).toHaveLength(2);
  });
});
