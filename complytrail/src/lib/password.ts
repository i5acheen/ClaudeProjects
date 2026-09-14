import bcrypt from "bcryptjs";

// Split out from lib/auth.ts so middleware.ts (Edge runtime) never pulls in
// bcryptjs, which needs Node APIs the Edge runtime doesn't provide.
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
