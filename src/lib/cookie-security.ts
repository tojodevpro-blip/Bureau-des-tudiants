export function secureCookiesEnabled() {
  if (process.env.NODE_ENV !== "production") return false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return !appUrl || appUrl.startsWith("https://");
}
