import "server-only";
import { getIdea, getUserRow, toPublicUser, type InvitationRow } from "./db";
import type { Invitation } from "./types";

/** Transforme une invitation de la base en objet affichable (idée + qui invite + qui est invité·e). */
export function toInvitation(r: InvitationRow): Invitation | null {
  const idea = getIdea(r.idea_id, null);
  const from = getUserRow(r.from_id);
  const to = getUserRow(r.to_id);
  if (!idea || !from || !to) return null;
  return {
    id: r.id,
    idea: { id: idea.id, title: idea.title, place: idea.place, startsAt: idea.startsAt, images: idea.images, category: idea.category },
    from: toPublicUser(from),
    to: toPublicUser(to),
    contribution: r.contribution,
    reason: r.reason,
    status: r.status,
    createdAt: r.created_at,
  };
}

export const toInvitations = (rows: InvitationRow[]) => rows.map(toInvitation).filter((i): i is Invitation => i !== null);
