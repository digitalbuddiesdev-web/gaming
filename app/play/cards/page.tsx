import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { CardGame } from "@/components/card-game";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Club Cards · Provably Fair Blackjack 21",
  description: "Cryptographically verified 52-card shoe with HMAC-SHA512 Fisher-Yates shuffle.",
};

export default async function CardsPage() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const recentHistory = await getRecentSimulatedRounds("cards");

  return (
    <div className="sim-page-container">
      <CardGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
