import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { PlinkoGame } from "@/components/plinko-game";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Plinko Physics · Provably Fair Multipliers",
  description: "Cascading Bernoulli pegboard physics with HMAC-SHA512 entropy.",
};

export default async function PlinkoPage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const recentHistory = await getRecentSimulatedRounds("plinko");

  return (
    <div className="sim-page-container">
      <PlinkoGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
