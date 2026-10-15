import "server-only";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import { getDb, getUserRow, type UserRow } from "./db";

// Sessions : jeton aléatoire dans un cookie httpOnly ; seule son empreinte SHA-256 est stockée en base.
const COOKIE = "complices_session";
const DAYS = 30;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + DAYS * 86_400_000);
  getDb().prepare(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`).run(sha256(token), userId, expires.toISOString());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COMPLICES_HTTPS === "1", // démo en http sur le Wi-Fi local
    path: "/",
    expires,
  });
}

export async function getCurrentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = getDb()
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token_hash = ?`)
    .get(sha256(token)) as { user_id: string; expires_at: string } | undefined;
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
  return getUserRow(row.user_id) ?? null;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) getDb().prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(sha256(token));
  store.delete(COOKIE);
}

export const NOT_LOGGED_IN = { error: "Connecte-toi ou crée un compte pour faire ça.", code: "auth" } as const;
