import Link from "next/link";
import { ProvablyFairShowcase } from "./provably-fair-showcase";
import { GameTileArt } from "./game-tile-art";

export type LobbyGame = {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_url?: string | null;
  provider_name: string;
  provider_slug: string;
};

export function GameLobby({
  title,
  subtitle,
  games,
  vendors,
  categories,
  basePath,
  vendor,
  category,
}: {
  title: string;
  subtitle: string;
  games: LobbyGame[];
  vendors: { slug: string; name: string }[];
  categories: string[];
  basePath: string;
  vendor?: string;
  category?: string;
}) {
  const link = (nextVendor?: string, nextCategory?: string) => {
    const params = new URLSearchParams();
    if (nextVendor) params.set("vendor", nextVendor);
    if (nextCategory) params.set("category", nextCategory);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="card lobby-stack">
      <ProvablyFairShowcase />

      <div className="lobby-section">
        <h1>{title}</h1>
        <p className="sub">{subtitle}</p>

        <div className="chips">
          <Link className={`chip ${!vendor ? "chip-on" : ""}`} href={link(undefined, category)}>
            All vendors
          </Link>
          {vendors.map((v) => (
            <Link key={v.slug} className={`chip ${vendor === v.slug ? "chip-on" : ""}`} href={link(v.slug, category)}>
              {v.name}
            </Link>
          ))}
        </div>

        <div className="chips">
          <Link className={`chip ${!category ? "chip-on" : ""}`} href={link(vendor, undefined)}>
            Popular game
          </Link>
          {categories.map((c) => (
            <Link key={c} className={`chip ${category === c ? "chip-on" : ""}`} href={link(vendor, c)}>
              {c}
            </Link>
          ))}
        </div>

        {games.length === 0 ? (
          <p className="muted">No games in this filter.</p>
        ) : (
          <div className="tiles">
            {games.map((game) => (
              <Link key={game.id} className="tile" href={`/play/games/${game.slug}`}>
                <GameTileArt name={game.name} slug={game.slug} imageUrl={game.image_url} />
                <span className="tile-name">{game.name}</span>
                <span className="tile-provider">{game.provider_name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
