export function mapIfDefined<T, R>(object: T | undefined, fn: (t: T) => R): R | undefined {
  if (object === undefined) {
    return undefined;
  }

  return fn(object);
}
