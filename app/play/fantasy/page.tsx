import { ProviderLobby } from "@/components/provider-lobby";

export default async function FantasyLobby({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; category?: string }>;
}) {
  return (
    <ProviderLobby
      type="fantasy"
      title="Fantasy game"
      subtitle="Fantasy contests from our vendor catalog. Launch is stubbed until the provider API is connected."
      basePath="/play/fantasy"
      searchParams={await searchParams}
    />
  );
}
