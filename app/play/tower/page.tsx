import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { TowerGame } from "@/components/tower-game";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Tower Ascent · Provably Fair Climbing",
  description: "8-floor vertical ascent matrix with recursive HMAC-SHA256 trap generation.",
};

export default async function TowerPage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const recentHistory = await getRecentSimulatedRounds("tower");

  return (
    <div className="sim-page-container">
      <TowerGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
