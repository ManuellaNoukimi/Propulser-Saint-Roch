"use client";

export const RESIDENT_PROGRESS_EVENT = "complices:resident-progress";
/** Emitted only after a successful action. The displayed amount is fetched from the server. */
export function notifyResidentProgress() {
  window.dispatchEvent(new Event(RESIDENT_PROGRESS_EVENT));
}
