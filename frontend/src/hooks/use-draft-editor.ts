"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { FormDetail } from "@/lib/contracts";
import { DraftStore } from "@/lib/editor/draft-store";

export function useDraftEditor(initial: FormDetail) {
  const client = useQueryClient();
  const [store] = useState(
    () =>
      new DraftStore(initial, (saved) => {
        client.setQueryData(["form", saved.id], saved);
        void client.invalidateQueries({ queryKey: ["forms"] });
      }),
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (store.getSnapshot().dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => {
      window.removeEventListener("beforeunload", guard);
      store.dispose();
    };
  }, [store]);
  return { ...state, store };
}
