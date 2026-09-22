export const PHILIP_USER_ID = '00000000-0000-0000-0000-000000000001';

export function normalizeUserId(userId: string): string {
  if (!userId) return PHILIP_USER_ID;
  if (userId === 'philip') return PHILIP_USER_ID;
  // If it's already a UUID, return as is
  if (userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return userId;
  }
  // For any other string, return fixed UUID for MVP
  return PHILIP_USER_ID;
}
