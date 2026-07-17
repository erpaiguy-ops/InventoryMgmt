export function toQueryString(params: object = {}): string {
  const query = new URLSearchParams(
    Object.entries(params as Record<string, unknown>).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') acc[key] = String(value);
        return acc;
      },
      {},
    ),
  ).toString();

  return query ? `?${query}` : '';
}
