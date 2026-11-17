import { ProviderLobby } from "@/components/provider-lobby";

export default async function VirtualLobby({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; category?: string }>;
}) {
  return (
    <ProviderLobby
      type="virtual"
      title="Our virtual"
      subtitle="Fast virtual sports and racing feeds. Launch is stubbed until the provider API is connected."
      basePath="/play/virtual"
      searchParams={await searchParams}
    />
  );
}
