import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase.js";
import {
  getOrCreateProfile,
  updateProfile,
  getTodayBlueprint,
  upsertTodayBlueprint,
  appendMicroTask,
} from "./db.js";

export function useKadijaData() {
  const [profile, setProfile] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setReady(true); // Run in "no database" mode so the UI still works.
      return;
    }
    (async () => {
      try {
        const p = await getOrCreateProfile();
        setProfile(p);
        const bp = await getTodayBlueprint(p.id);
        setBlueprint(bp);
      } catch (err) {
        console.error(err);
        setDbError("Couldn't reach Supabase. Check .env and schema setup.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setMicroTasks = useCallback(
    async (tasks) => {
      if (!profile) throw new Error("Still loading your profile — try again in a moment.");
      const bp = await upsertTodayBlueprint(profile.id, { micro_tasks: tasks });
      setBlueprint(bp);
    },
    [profile]
  );

  // Atomic single-task append — for adding ONE new task (the suggested-
  // step chips), as opposed to setMicroTasks above which sets the whole
  // array (used for toggling/removing an existing task, where the caller
  // legitimately needs to supply an arbitrary new array state). Uses
  // append_micro_task under the hood (see schema.sql) so two concurrent
  // adds can't silently drop one of them.
  const addMicroTask = useCallback(
    async (task) => {
      if (!profile) throw new Error("Still loading your profile — try again in a moment.");
      const bp = await appendMicroTask(profile.id, task);
      setBlueprint(bp);
    },
    [profile]
  );

  const setFocus = useCallback(
    async (text, elementTag) => {
      if (!profile) throw new Error("Still loading your profile — try again in a moment.");
      const bp = await upsertTodayBlueprint(profile.id, {
        primary_focus: text,
        element_tag: elementTag,
      });
      setBlueprint(bp);
    },
    [profile]
  );

  const saveProfileFields = useCallback(
    async (patch) => {
      if (!profile) throw new Error("Still loading your profile — try again in a moment.");
      const p = await updateProfile(profile.id, patch);
      setProfile(p);
    },
    [profile]
  );

  return {
    profile,
    blueprint,
    ready,
    dbError,
    setFocus,
    setMicroTasks,
    addMicroTask,
    saveProfileFields,
  };
}
