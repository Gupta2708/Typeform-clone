import { Builder } from "@/components/builder/builder";
export default async function BuilderPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  return <Builder formId={formId} />;
}
