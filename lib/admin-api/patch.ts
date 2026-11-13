export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyRecord(value: unknown): value is Record<string, unknown> {
  return isJsonRecord(value) && Object.keys(value).length === 0;
}

export function diffJsonValue(current: unknown, previous: unknown): unknown {
  if (Object.is(current, previous)) {
    return undefined;
  }
  if (Array.isArray(current) && Array.isArray(previous)) {
    return JSON.stringify(current) === JSON.stringify(previous)
      ? undefined
      : current;
  }
  if (isJsonRecord(current) && isJsonRecord(previous)) {
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(current)) {
      const change = diffJsonValue(value, previous[key]);
      if (change !== undefined) {
        changes[key] = change;
      }
    }
    return Object.keys(changes).length > 0 ? changes : undefined;
  }
  return current;
}

export function removeEmptyObjects(value: unknown): unknown {
  if (!isJsonRecord(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      continue;
    }
    const cleaned = removeEmptyObjects(item);
    if (!isEmptyRecord(cleaned)) {
      result[key] = cleaned;
    }
  }
  return result;
}
