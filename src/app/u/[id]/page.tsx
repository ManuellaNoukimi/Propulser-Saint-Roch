import { Suspense } from "react";
import { ProfileView } from "@/components/ProfileView";

// Profil public : params lus dans un <Suspense> (cacheComponents).
export default function UserPage({ params }: PageProps<"/u/[id]">) {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">Chargement…</div>}>
      {params.then(({ id }) => (
        <ProfileView id={id} />
      ))}
    </Suspense>
  );
}
