import { Layers2 } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Layers2 size={23} strokeWidth={1.8} aria-hidden="true" />
      {!compact && (
        <span>
          typeform<span className="brand-mark"> / </span>builder
        </span>
      )}
    </span>
  );
}
