import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { sql } from "@/lib/db";
import { GameLobby, type LobbyGame } from "./game-lobby";

/**
 * Shared body for the live/slot/virtual/fantasy lobbies. They differ only by the
 * `type` filter, so four thin pages drive this one component.
 */
export async function ProviderLobby({
  type,
  title,
  subtitle,
  basePath,
  searchParams,
}: {
  type: "live" | "slot" | "virtual" | "fantasy";
  title: string;
  subtitle: string;
  basePath: string;
  searchParams: { vendor?: string; category?: string };
}) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const games = await sql<LobbyGame & { type: string }>(
    `select g.id, g.slug, g.name, g.category, g.type, g.image_url, p.name as provider_name, p.slug as provider_slug
       from casino_games g
       join casino_providers p on p.id = g.provider_id
      where g.type = $1
      order by g.sort_order, g.name`,
    [type],
  );

  const vendors = [...new Map(games.map((g) => [g.provider_slug, g.provider_name])).entries()].map(
    ([slug, name]) => ({ slug, name }),
  );
  const categories = [...new Set(games.map((g) => g.category))];

  const filtered = games.filter(
    (g) =>
      (!searchParams.vendor || g.provider_slug === searchParams.vendor) &&
      (!searchParams.category || g.category === searchParams.category),
  );

  return (
    <GameLobby
      title={title}
      subtitle={subtitle}
      games={filtered}
      vendors={vendors}
      categories={categories}
      basePath={basePath}
      vendor={searchParams.vendor}
      category={searchParams.category}
    />
  );
}
