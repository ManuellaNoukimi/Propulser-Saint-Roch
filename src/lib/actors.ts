import "server-only";
import { ACTOR_TYPES } from "./constants";
import { getDb, toPublicUser } from "./db";
import { locateInSaintRoch, type Located } from "./saint-roch-streets";
import { listSdcMembers } from "./sdc-members";
import type { PublicUser } from "./types";

// Annuaire des acteurs : les comptes Commerce, Entreprise et Organisme de l'app (page publique /u/:id),
// et les commerces de la liste SDC (fiche /annuaire/sdc/:id), lus à l'exécution, jamais copiés dans le code.

const ESTABLISHMENTS = ACTOR_TYPES.filter((a) => a.group === "etablissement").map((a) => a.id);

export type DirectoryActor = PublicUser & {
  activities: number; // activités publiées (Vie Saint-Roch)
  posts: number; // publications d'entreprise (promo, emploi…)
  complices: number; // personnes devenues complices de ses activités
  joinedAt: string;
  at: Located | null; // position : adresse exacte, ou milieu de la rue (approximatif)
};

export function listActors(): DirectoryActor[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id, u.display_name, u.account_type, u.sector, u.address, u.description, u.created_at,
        (SELECT COUNT(*) FROM ideas i WHERE i.organizer_id = u.id AND COALESCE(i.kind, 'activite') = 'activite' AND COALESCE(i.hidden, 0) = 0) AS activities,
        (SELECT COUNT(*) FROM ideas i WHERE i.organizer_id = u.id AND i.kind = 'entreprise' AND COALESCE(i.hidden, 0) = 0) AS posts,
        (SELECT COUNT(*) FROM complices c JOIN ideas i ON i.id = c.idea_id WHERE i.organizer_id = u.id) AS complices
       FROM users u WHERE u.account_type IN (${ESTABLISHMENTS.map(() => "?").join(",")})
       ORDER BY u.display_name COLLATE NOCASE`,
    )
    .all(...ESTABLISHMENTS) as {
      id: string; display_name: string; account_type: string; sector: string | null; address: string | null; description: string | null;
      created_at: string; activities: number; posts: number; complices: number;
    }[];
  return rows.map((r) => ({
    ...toPublicUser(r),
    activities: r.activities,
    posts: r.posts,
    complices: r.complices,
    joinedAt: r.created_at,
    at: locateInSaintRoch(r.address),
  }));
}

export type SdcDirectoryEntry = {
  id: string; name: string; activity: string; street: string; nonprofit: boolean; address: string | null;
  at: Located | null; googleMapsUrl: string; accountId: string | null; // compte Complices du même nom, s'il existe
};

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Commerces et organismes de la liste SDC (sans les locaux vacants, qui sont dans Vitrines). */
export function listSdcDirectory(actors: DirectoryActor[] = listActors()): SdcDirectoryEntry[] {
  const byName = new Map(actors.map((a) => [fold(a.displayName), a.id]));
  return listSdcMembers().members
    .filter((m) => !m.isVacant)
    .map((m) => ({
      id: m.id, name: m.name, activity: m.activity, street: m.street, nonprofit: m.nonprofit, address: m.address,
      at: m.lat !== null && m.lng !== null ? { lat: m.lat, lng: m.lng, exact: true, address: m.address ?? m.street } : locateInSaintRoch(m.street),
      googleMapsUrl: m.googleMapsUrl,
      accountId: byName.get(fold(m.name)) ?? null,
    }));
}

export function getSdcDirectoryEntry(id: string): SdcDirectoryEntry | null {
  return listSdcDirectory().find((m) => m.id === id) ?? null;
}
