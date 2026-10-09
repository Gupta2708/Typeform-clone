import type { Answers, AnswerValue, Question } from "@/lib/contracts";

const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
export function normalizeAnswer(
  question: Question,
  raw?: AnswerValue,
): { value?: AnswerValue; error?: string } {
  const empty = raw === undefined || (typeof raw === "string" && !raw.trim());
  if (empty)
    return question.required ? { error: "Please answer this question." } : {};
  switch (question.type) {
    case "short_text":
    case "long_text":
    case "email": {
      if (typeof raw !== "string") return { error: "Enter a text answer." };
      const value = question.type === "long_text" ? raw : raw.trim();
      if (value.length > 10_000)
        return { error: "Keep your answer under 10,000 characters." };
      if (
        question.type === "email" &&
        (!email.test(value) || value.length > 254)
      )
        return { error: "Enter a valid email address." };
      return { value };
    }
    case "number": {
      if (
        typeof raw === "boolean" ||
        (typeof raw === "string" && !numeric.test(raw.trim()))
      )
        return { error: "Enter a finite number." };
      const value = Number(raw);
      if (!Number.isFinite(value)) return { error: "Enter a finite number." };
      if (question.settings.min != null && value < question.settings.min)
        return { error: `Enter at least ${question.settings.min}.` };
      if (question.settings.max != null && value > question.settings.max)
        return { error: `Enter no more than ${question.settings.max}.` };
      return { value };
    }
    case "yes_no":
      return typeof raw === "boolean"
        ? { value: raw }
        : { error: "Choose Yes or No." };
    case "rating":
      return typeof raw === "number" &&
        Number.isInteger(raw) &&
        raw >= 1 &&
        raw <= question.settings.scale
        ? { value: raw }
        : { error: `Choose a rating from 1 to ${question.settings.scale}.` };
    case "multiple_choice":
    case "dropdown":
      return typeof raw === "string" &&
        question.options.some((option) => option.id === raw)
        ? { value: raw }
        : { error: "Choose an option from this question." };
  }
}

export function normalizeAll(questions: Question[], answers: Answers) {
  const values: Answers = {};
  for (const question of questions) {
    const result = normalizeAnswer(question, answers[question.id]);
    if (result.error)
      return { values, error: result.error, questionId: question.id };
    if (result.value !== undefined) values[question.id] = result.value;
  }
  return { values };
}
