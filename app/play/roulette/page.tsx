import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { RouletteGame } from "@/components/roulette-game";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Roulette Royale · European Single-Zero Table",
  description: "Cryptographically verified 37-pocket European roulette with HMAC-SHA256 wheel physics.",
};

export default async function RoulettePage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const recentHistory = await getRecentSimulatedRounds("roulette");

  return (
    <div className="sim-page-container">
      <RouletteGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
