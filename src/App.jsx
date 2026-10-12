import { useState } from "react";
import TabBar from "./components/TabBar.jsx";
import ActionCenterTab from "./tabs/ActionCenterTab.jsx";
import ContentEngineTab from "./tabs/ContentEngineTab.jsx";
import BlueprintTab from "./tabs/BlueprintTab.jsx";
import { useKadijaData } from "./lib/useKadijaData.js";
import { saveScript } from "./lib/db.js";

const TAB_TITLES = {
  action: "Action Center",
  content: "Content Engine",
  blueprint: "Blueprint & Chart",
};

export default function App() {
  const {
    profile,
    blueprint,
    ready,
    dbError,
    setMicroTasks,
    addMicroTask,
    saveProfileFields,
  } = useKadijaData();

  const [tab, setTab] = useState("action");

  async function handleScriptSaved(dump, result) {
    if (!profile) throw new Error("Still loading your profile — try again in a moment.");
    try {
      await saveScript(profile.id, {
        raw_brain_dump: dump,
        short_form_script: result.tiktok_reels_script,
        instagram_caption: result.instagram_caption,
        x_thread: result.x_post || "",
        facebook_post: result.facebook_post,
        execution_steps: result.execution_steps || {},
        hook_variants: result.hook_variants || [],
        algorithm_boost: result.algorithm_boost || [],
        hashtags: result.hashtags || {},
        engagement_tip: result.engagement_tip,
        word_count: result.word_count,
        status: "draft",
      });
    } catch (err) {
      console.error("Couldn't save script:", err);
      throw err; // let callers (Action Center, Content Engine) know it actually failed
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-xl mx-auto px-5 pt-10 pb-28 flex flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-muted">{profile?.name || "Kadija"}</p>
          <h1 className="font-display text-4xl text-cream">{TAB_TITLES[tab]}</h1>
          {dbError && <p className="text-xs text-fire mt-2">{dbError}</p>}
        </header>

        {tab === "action" && (
          <ActionCenterTab
            profile={profile}
            blueprint={blueprint}
            onSaveTasks={setMicroTasks}
            onAddTask={addMicroTask}
            onContentSaved={handleScriptSaved}
            onViewContent={() => setTab("content")}
          />
        )}
        {tab === "content" && <ContentEngineTab profile={profile} onSaved={handleScriptSaved} />}
        {tab === "blueprint" && <BlueprintTab profile={profile} onSave={saveProfileFields} />}

        {!ready && <p className="text-xs text-muted">Loading your blueprint…</p>}
      </div>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
