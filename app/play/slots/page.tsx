import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { SlotGame } from "@/components/slot-game";
import { ProviderLobby } from "@/components/provider-lobby";
import { getRecentSimulatedRounds } from "@/lib/simulated-actions";

export const metadata = {
  title: "Apex Slots · Provably Fair Neon Reels",
  description: "Cryptographically verified 5x3 slot machine with 20 fixed paylines and HMAC-SHA512 reel strips.",
};

export default async function SlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; category?: string; catalog?: string }>;
}) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const sp = await searchParams;
  if (sp.catalog === "1" || sp.vendor) {
    return (
      <ProviderLobby
        type="slot"
        title="Slot Game Catalog"
        subtitle="Slot and arcade titles from our vendor catalog."
        basePath="/play/slots"
        searchParams={sp}
      />
    );
  }

  const recentHistory = await getRecentSimulatedRounds("slot");

  return (
    <div className="sim-page-container">
      <SlotGame
        initialBalance={Number(viewer.balance)}
        recentHistory={recentHistory}
      />
    </div>
  );
}
