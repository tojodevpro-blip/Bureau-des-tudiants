const STORAGE_KEY_PATTERN = /^[a-z0-9/_.-]+$/i;

export function isSafeStorageKey(key: string) {
  if (!STORAGE_KEY_PATTERN.test(key)) return false;
  return key.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}
