export class GandiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(`Gandi API error ${status}: ${detail}`);
    this.name = "GandiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toUserMessage(): string {
    switch (this.status) {
      case 401:
        return "Gandi rejected the API key. Regenerate at admin.gandi.net and update ~/.gandi-mcp/config.json.";
      case 403:
        return "Your Gandi PAT lacks permission for this operation.";
      case 404:
        return `Not found: ${this.detail} — check domain/name/type are correct.`;
      case 409:
        return this.detail;
      case 429:
        return "Rate limited by Gandi. Retry in a moment.";
      default:
        if (this.status >= 500 && this.status < 600) {
          return `Gandi server error (${this.status}). Try again.`;
        }
        return this.detail;
    }
  }
}
