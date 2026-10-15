import type { Metadata } from "next";
import { CreatePost } from "@/components/CreatePost";

export const metadata: Metadata = { title: "Nouvelle publication · Complices" };

export default function CreatePage() {
  return <CreatePost />;
}
