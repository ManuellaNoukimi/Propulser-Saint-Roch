import { Suspense } from "react";
import { ResidentCheckin } from "@/components/ResidentCheckin";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8">Chargement…</p>}>
      {params.then(({ id }) => (
        <ResidentCheckin id={id} />
      ))}
    </Suspense>
  );
}
