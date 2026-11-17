import { ProviderLobby } from "@/components/provider-lobby";

export default async function LiveLobby({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; category?: string }>;
}) {
  return (
    <ProviderLobby
      type="live"
      title="Live casino"
      subtitle="Dealer tables served by our aggregator vendors. Launch is stubbed until the provider API is connected."
      basePath="/play/live"
      searchParams={await searchParams}
    />
  );
}
