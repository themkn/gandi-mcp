export interface DnsRecord {
  readonly rrset_name: string;
  readonly rrset_type: string;
  readonly rrset_values: readonly string[];
  readonly rrset_ttl: number;
  readonly rrset_href?: string;
}

export interface Domain {
  readonly fqdn: string;
}

export interface Snapshot {
  readonly id: string;
  readonly name?: string;
  readonly created_at: string;
  readonly automatic?: boolean;
}

export interface RecordInput {
  readonly name: string;
  readonly type: string;
  readonly values: readonly string[];
  readonly ttl?: number;
}
