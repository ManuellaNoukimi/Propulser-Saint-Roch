"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { REGISTRATION_CONFIRMED_EVENT } from "@/lib/registration-confirmation";
import "./registration-confirmation.css";

export function RegistrationConfirmation() {
  const [title, setTitle] = useState("");
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function confirmed(event: Event) {
      const title = (event as CustomEvent<string>).detail;
      if (typeof title !== "string") return;
      setTitle(title);
      setOpen(true);
    }
    window.addEventListener(REGISTRATION_CONFIRMED_EVENT, confirmed);
    return () => window.removeEventListener(REGISTRATION_CONFIRMED_EVENT, confirmed);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      if (element.open) element.close();
      return;
    }
    if (!element.open) element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflow; };
  }, [open]);

  return (
    <dialog ref={dialog} className="join-dialog registration-confirmation" aria-labelledby={headingId} aria-describedby={descriptionId}
      onCancel={(event) => { event.preventDefault(); setOpen(false); }} onClose={() => setOpen(false)}
      onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="registration-confirmation-content">
        <button type="button" className="registration-confirmation-close" aria-label="Fermer la confirmation" title="Fermer" onClick={() => setOpen(false)}><X size={20} /></button>
        <span className="registration-confirmation-check" aria-hidden="true"><Check size={28} strokeWidth={1.8} /></span>
        <h2 id={headingId}>Inscription confirmée</h2>
        {title && <p className="registration-confirmation-activity">{title}</p>}
        <p id={descriptionId} className="registration-confirmation-message">Un rappel par mail vous sera envoyé le jour de l&apos;événement.</p>
        <button type="button" className="ig-btn w-full" autoFocus onClick={() => setOpen(false)}>Compris</button>
      </div>
    </dialog>
  );
}
