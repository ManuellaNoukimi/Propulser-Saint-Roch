import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Mots de passe chiffrés avec scrypt (sel aléatoire). Format stocké : scrypt$<sel hex>$<hash hex>
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false; // ex. comptes de démo sans mot de passe
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** Valeur qui ne correspond à aucun mot de passe (comptes de démo non connectables). */
export const NO_PASSWORD = "disabled";
