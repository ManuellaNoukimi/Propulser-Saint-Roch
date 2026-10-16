"use client";

export const REGISTRATION_CONFIRMED_EVENT = "complices:registration-confirmed";

export function confirmRegistration(title: string) {
  window.dispatchEvent(new CustomEvent<string>(REGISTRATION_CONFIRMED_EVENT, { detail: title }));
}
