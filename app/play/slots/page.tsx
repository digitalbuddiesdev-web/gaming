import { ProviderLobby } from "@/components/provider-lobby";

export default async function SlotsLobby({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string; category?: string }>;
}) {
  return (
    <ProviderLobby
      type="slot"
      title="Slot game"
      subtitle="Slot and arcade titles from our vendor catalog. Launch is stubbed until the provider API is connected."
      basePath="/play/slots"
      searchParams={await searchParams}
    />
  );
}
