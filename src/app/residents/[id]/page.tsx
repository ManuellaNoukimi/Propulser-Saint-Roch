import { Suspense } from "react";
import { ResidentPublicProfile } from "@/components/ResidentPublicProfile";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8">Chargement…</p>}>
      {params.then(({ id }) => (
        <ResidentPublicProfile id={id} />
      ))}
    </Suspense>
  );
}
