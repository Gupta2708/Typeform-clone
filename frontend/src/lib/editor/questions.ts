import type { Question, QuestionType } from "@/lib/contracts";

export function makeQuestion(
  type: QuestionType,
  existing?: Question,
): Question {
  const base = {
    id: existing?.id ?? crypto.randomUUID(),
    title: existing?.title ?? "",
    description: existing?.description ?? "",
    required: existing?.required ?? false,
  };
  if (type === "multiple_choice" || type === "dropdown")
    return {
      ...base,
      type,
      settings: {},
      options:
        existing &&
        (existing.type === "multiple_choice" || existing.type === "dropdown")
          ? existing.options
          : [
              { id: crypto.randomUUID(), label: "Choice 1" },
              { id: crypto.randomUUID(), label: "Choice 2" },
            ],
    };
  if (type === "rating")
    return {
      ...base,
      type,
      settings: {
        scale: existing?.type === "rating" ? existing.settings.scale : 5,
      },
      options: [],
    };
  if (type === "number")
    return {
      ...base,
      type,
      settings:
        existing?.type === "number"
          ? existing.settings
          : { min: null, max: null },
      options: [],
    };
  return { ...base, type, settings: {}, options: [] };
}
export function hasIncompatibleSettings(
  question: Question,
  type: QuestionType,
) {
  if (question.type === type) return false;
  if (question.type === "multiple_choice" || question.type === "dropdown")
    return type !== "multiple_choice" && type !== "dropdown";
  if (question.type === "number")
    return question.settings.min != null || question.settings.max != null;
  return question.type === "rating" && question.settings.scale !== 5;
}
