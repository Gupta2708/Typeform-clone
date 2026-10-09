export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "dropdown",
  "email",
  "number",
  "yes_no",
  "rating",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type AnswerValue = string | number | boolean;
export type Answers = Record<string, AnswerValue>;
export type Option = { id: string; label: string };
export type QuestionBase = {
  id: string;
  title: string;
  description: string;
  required: boolean;
};
type PlainQuestion = QuestionBase & {
  type: "short_text" | "long_text" | "email" | "yes_no";
  settings: Record<string, never>;
  options: [];
};
type ChoiceQuestion = QuestionBase & {
  type: "multiple_choice" | "dropdown";
  settings: Record<string, never>;
  options: Option[];
};
type NumberQuestion = QuestionBase & {
  type: "number";
  settings: { min?: number | null; max?: number | null };
  options: [];
};
type RatingQuestion = QuestionBase & {
  type: "rating";
  settings: { scale: number };
  options: [];
};
export type Question =
  PlainQuestion | ChoiceQuestion | NumberQuestion | RatingQuestion;
export type FormDefinition = {
  title: string;
  theme: { key: "neutral" };
  thank_you: { title: string; description: string };
  questions: Question[];
};
export type FormCard = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  draft_revision: number;
  response_count: number;
  question_count: number;
  created_at: string;
  updated_at: string;
};
export type VersionMetadata = {
  id: string;
  version_number: number;
  source_draft_revision: number;
  published_at: string;
};
export type FormDetail = FormCard &
  FormDefinition & {
    published_version_id: string | null;
    versions: VersionMetadata[];
  };
export type FormList = {
  items: FormCard[];
  total: number;
  limit: number;
  offset: number;
};
export type DraftWrite = FormDefinition & { expected_revision: number };
export type SubmissionRequest = {
  form_version_id: string;
  idempotency_key: string;
  answers: { question_id: string; value: AnswerValue }[];
};
export type SubmissionReceipt = {
  id: string;
  form_version_id: string;
  submitted_at: string;
};
export type PublicForm = FormDefinition & { form_version_id: string };
export type ErrorDetail = {
  field?: string;
  question_id?: string;
  message: string;
};
export type ErrorEnvelope = {
  error: { code: string; message: string; details: ErrorDetail[] };
};
