export function getAdminKeyFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_ADMIN_KEY;
}
