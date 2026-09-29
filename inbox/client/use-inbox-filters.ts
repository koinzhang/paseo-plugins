import { useSettings } from "@getpaseo/plugin/client";
import { useToast } from "@getpaseo/plugin/client/react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  INBOX_FILTER_DEFAULTS,
  inboxFilterSettings,
  sameInboxFilters,
  type InboxFilters,
} from "../shared/filter-settings.ts";

/**
 * The last kind / workspace / project selection, stored in host settings.
 * A click updates the chips immediately and writes the full document.
 */
export function useInboxFilters(): {
  values: InboxFilters | null;
  update: (patch: Partial<InboxFilters>) => void;
} {
  const settings = useSettings(inboxFilterSettings);
  const toast = useToast();
  const [patch, setPatch] = useState<Partial<InboxFilters>>({});
  const patchRef = useRef(patch);
  patchRef.current = patch;
  const wasSaving = useRef(false);
  const writeId = useRef(0);
  const prevStatus = useRef(settings.status);
  const toasted = useRef<string | null>(null);

  const beginWrite = () => {
    writeId.current += 1;
    return writeId.current;
  };
  const endWrite = (id: number) => {
    if (writeId.current === id) writeId.current = 0;
  };

  const saved = settings.status === "ready" ? settings.values : null;
  const values = useMemo(() => {
    if (saved) return Object.keys(patch).length === 0 ? saved : { ...saved, ...patch };
    if (settings.status === "loading") {
      return Object.keys(patch).length === 0 ? null : { ...INBOX_FILTER_DEFAULTS, ...patch };
    }
    return { ...INBOX_FILTER_DEFAULTS, ...patch };
  }, [patch, saved, settings.status]);

  const update = (next: Partial<InboxFilters>) => {
    const merged = { ...patchRef.current, ...next };
    patchRef.current = merged;
    setPatch(merged);
    if (settings.status !== "ready" || settings.saving || writeId.current !== 0) return;
    const id = beginWrite();
    void settings.save({ ...settings.values, ...merged }, settings.revision).finally(() => endWrite(id));
  };

  useEffect(() => {
    if (settings.saveError && toasted.current !== settings.saveError) {
      toasted.current = settings.saveError;
      toast.error(settings.saveError);
    }
    if (!settings.saveError) toasted.current = null;

    const becameReady = prevStatus.current !== "ready" && settings.status === "ready";
    const finishedSave = wasSaving.current && !settings.saving;
    prevStatus.current = settings.status;
    wasSaving.current = settings.saving;
    if (settings.status !== "ready" || settings.saving || settings.saveError) return;
    if (writeId.current !== 0 && !finishedSave) return;

    const pending = patchRef.current;
    if (Object.keys(pending).length === 0) return;
    const next = { ...settings.values, ...pending };
    if (sameInboxFilters(next, settings.values)) {
      patchRef.current = {};
      setPatch({});
      return;
    }
    if (!becameReady && !finishedSave) return;
    const id = beginWrite();
    void settings.save(next, settings.revision).finally(() => endWrite(id));
  }, [settings, toast]);

  return { values, update };
}
