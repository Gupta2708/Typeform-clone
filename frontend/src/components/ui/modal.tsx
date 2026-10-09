"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useId, useRef } from "react";

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}) {
  const descriptionId = useId();
  const previousFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          aria-describedby={description ? descriptionId : undefined}
          onOpenAutoFocus={(event) => {
            previousFocus.current =
              document.activeElement as HTMLElement | null;
            const input = (
              event.currentTarget as HTMLElement
            ).querySelector<HTMLElement>("input:not([readonly]), textarea");
            if (input) {
              event.preventDefault();
              input.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            const target = previousFocus.current;
            if (!target?.isConnected) return;
            event.preventDefault();
            const details = target.closest("details");
            if (details && !details.open)
              details.querySelector("summary")?.focus();
            else target.focus();
          }}
        >
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          {description && (
            <Dialog.Description
              className="dialog-description"
              id={descriptionId}
            >
              {description}
            </Dialog.Description>
          )}
          <Dialog.Close asChild>
            <button
              className="icon-button dialog-close"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
