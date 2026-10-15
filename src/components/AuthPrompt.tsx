import Link from "next/link";

// Affiché quand une action demande un compte (publier, se proposer…).
export function AuthPrompt({ title, text, next }: { title: string; text: string; next: string }) {
  return (
    <div className="mx-auto my-8 max-w-sm rounded-3xl border border-line bg-bg px-6 py-10 text-center md:my-16">
      <p className="font-logo text-[42px] leading-tight">Complices<span className="text-ig-blue">.</span></p>
      <h1 className="mt-6 text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>
      <Link href={`/inscription?next=${encodeURIComponent(next)}`} className="ig-btn mt-6 block py-2">
        Créer un compte
      </Link>
      <Link href={`/connexion?next=${encodeURIComponent(next)}`} className="mt-3 block font-semibold text-ig-blue">
        J&apos;ai déjà un compte
      </Link>
    </div>
  );
}
