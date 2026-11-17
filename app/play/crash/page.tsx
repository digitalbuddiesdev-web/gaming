import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { CrashGame } from "@/components/crash-game";
import { getRecentSimulatedRounds, sweepStaleCrashRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Crash Rocket · Provably Fair Multiplier",
  description: "High-frequency provably fair crash game simulation with HMAC-SHA256 curve.",
};

export default async function CrashPage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  await sweepStaleCrashRounds();
  const recentHistory = await getRecentSimulatedRounds("crash");

  return (
    <div className="sim-page-container">
      <CrashGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
