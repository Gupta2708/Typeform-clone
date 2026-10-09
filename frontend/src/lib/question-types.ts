import {
  AlignLeft,
  ChevronDown,
  Hash,
  List,
  Mail,
  Star,
  ToggleRight,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { QuestionType } from "@/lib/contracts";

export const questionTypes: Record<
  QuestionType,
  { label: string; icon: LucideIcon; color: string }
> = {
  short_text: { label: "Short text", icon: Type, color: "text" },
  long_text: { label: "Long text", icon: AlignLeft, color: "text" },
  multiple_choice: { label: "Multiple choice", icon: List, color: "choice" },
  dropdown: { label: "Dropdown", icon: ChevronDown, color: "choice" },
  email: { label: "Email", icon: Mail, color: "email" },
  number: { label: "Number", icon: Hash, color: "number" },
  yes_no: { label: "Yes / No", icon: ToggleRight, color: "boolean" },
  rating: { label: "Rating", icon: Star, color: "rating" },
};
