import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { MinesGame } from "@/components/mines-game";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Mines Matrix · Provably Fair Grid",
  description: "Cryptographically verified 5x5 Mines matrix game with escalating multipliers.",
};

export default async function MinesPage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const recentHistory = await getRecentSimulatedRounds("mines");

  return (
    <div className="sim-page-container">
      <MinesGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
