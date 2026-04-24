import type { DnsRecord, Domain, RecordInput, Snapshot } from "./types.js";
import { GandiError } from "./errors.js";

const BASE_URL = "https://api.gandi.net/v5/livedns";

export class GandiClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = (await response.json()) as { message?: string };
        if (body.message) detail = body.message;
      } catch {
        // body not JSON — keep statusText
      }
      throw new GandiError(response.status, detail);
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  async listDomains(): Promise<Domain[]> {
    return this.request<Domain[]>("/domains");
  }

  async listRecords(domain: string): Promise<DnsRecord[]> {
    return this.request<DnsRecord[]>(`/domains/${encodeURIComponent(domain)}/records`);
  }

  async getRecord(domain: string, name: string, type: string): Promise<DnsRecord> {
    return this.request<DnsRecord>(
      `/domains/${encodeURIComponent(domain)}/records/${encodeURIComponent(name)}/${encodeURIComponent(type)}`,
    );
  }

  async addRecord(domain: string, input: RecordInput): Promise<void> {
    await this.request<void>(`/domains/${encodeURIComponent(domain)}/records`, {
      method: "POST",
      body: JSON.stringify({
        rrset_name: input.name,
        rrset_type: input.type,
        rrset_values: input.values,
        rrset_ttl: input.ttl ?? 300,
      }),
    });
  }

  async updateRecord(domain: string, input: RecordInput): Promise<void> {
    await this.request<void>(
      `/domains/${encodeURIComponent(domain)}/records/${encodeURIComponent(input.name)}/${encodeURIComponent(input.type)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          rrset_values: input.values,
          rrset_ttl: input.ttl ?? 300,
        }),
      },
    );
  }

  async deleteRecord(domain: string, name: string, type: string): Promise<void> {
    await this.request<void>(
      `/domains/${encodeURIComponent(domain)}/records/${encodeURIComponent(name)}/${encodeURIComponent(type)}`,
      { method: "DELETE" },
    );
  }

  async listSnapshots(domain: string): Promise<Snapshot[]> {
    return this.request<Snapshot[]>(`/domains/${encodeURIComponent(domain)}/snapshots`);
  }

  async createSnapshot(domain: string, name?: string): Promise<Snapshot> {
    const init: RequestInit = { method: "POST" };
    if (name !== undefined) init.body = JSON.stringify({ name });
    return this.request<Snapshot>(`/domains/${encodeURIComponent(domain)}/snapshots`, init);
  }
}
