import { Suspense } from "react";
import { DetailSkeleton, PostDetail } from "@/components/PostDetail";

// cacheComponents : l'id est une donnée « runtime » → params lus dans un <Suspense> (docs Next 16, dynamic routes).
export default function PostPage({ params }: PageProps<"/p/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      {params.then(({ id }) => (
        <PostDetail id={id} />
      ))}
    </Suspense>
  );
}
