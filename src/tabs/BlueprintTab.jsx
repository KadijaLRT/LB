import { useState } from "react";
import { Sparkles, Compass, Settings as SettingsIcon } from "lucide-react";
import SubTabBar from "../components/SubTabBar.jsx";
import FullChartReading from "../components/FullChartReading.jsx";
import SettingsPage from "../components/SettingsPage.jsx";
import LifeAreaExplorer from "../components/LifeAreaExplorer.jsx";

const SUB_TABS = [
  { key: "chart", label: "Chart", icon: Sparkles },
  { key: "explore", label: "Explore", icon: Compass },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export default function BlueprintTab({ profile, onSave }) {
  const [subTab, setSubTab] = useState("chart");

  return (
    <div className="flex flex-col gap-6">
      <SubTabBar tabs={SUB_TABS} active={subTab} onChange={setSubTab} />

      {subTab === "chart" && (
        <div className="flex flex-col gap-6">
          <FullChartReading profile={profile} />
        </div>
      )}

      {subTab === "explore" && <LifeAreaExplorer profile={profile} />}

      {subTab === "settings" && <SettingsPage profile={profile} onSave={onSave} />}
    </div>
  );
}
