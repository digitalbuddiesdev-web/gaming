import Link from "next/link";
import { ProvablyFairShowcase } from "./provably-fair-showcase";

export type LobbyGame = {
  id: string;
  slug: string;
  name: string;
  category: string;
  image_url?: string | null;
  provider_name: string;
  provider_slug: string;
};

const hue = (slug: string) => [...slug].reduce((n, c) => n + c.charCodeAt(0), 0) % 360;

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
            {games.map((game) => {
              const h = hue(game.slug);
              return (
                <Link key={game.id} className="tile" href={`/play/games/${game.slug}`}>
                  <span
                    className="tile-art"
                    style={game.image_url ? undefined : { background: `linear-gradient(145deg, hsl(${h} 45% 24%), hsl(${(h + 45) % 360} 45% 12%))` }}
                  >
                    {game.image_url ? (
                      <img className="tile-art-img" src={game.image_url} alt="" loading="lazy" />
                    ) : (
                      game.name.slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="tile-name">{game.name}</span>
                  <span className="tile-provider">{game.provider_name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
