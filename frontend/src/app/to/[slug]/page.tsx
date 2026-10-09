import { PublicFlow } from "@/components/player/public-flow";

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicFlow slug={slug} />;
}
