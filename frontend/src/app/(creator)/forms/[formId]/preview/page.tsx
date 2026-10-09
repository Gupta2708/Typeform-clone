import { Preview } from "@/components/player/preview";
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <Preview formId={formId} />;
}
