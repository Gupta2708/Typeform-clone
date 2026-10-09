import type { QuestionType } from "@/lib/contracts";
import { questionTypes } from "@/lib/question-types";
export function TypeBadge({ type }: { type: QuestionType }) {
  const { icon: Icon, color } = questionTypes[type];
  return (
    <span className={`type-badge type-${color}`}>
      <Icon size={15} />
    </span>
  );
}
