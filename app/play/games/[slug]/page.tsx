import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { one } from "@/lib/db";

type Game = {
  name: string;
  slug: string;
  type: string;
  category: string;
  provider_name: string;
  provider_slug: string;
};

export default async function GameDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const game = await one<Game>(
    `select g.name, g.slug, g.type, g.category, p.name as provider_name, p.slug as provider_slug
       from casino_games g
       join casino_providers p on p.id = g.provider_id
      where g.slug = $1`,
    [slug],
  );
  if (!game) notFound();

  return (
    <>
      <div className="card">
        <h1>{game.name}</h1>
        <p className="sub">
          {game.provider_name} · {game.category} · {game.type}
        </p>
        <div className="preview">
          <span>{game.name}</span>
          <span className="muted">{game.provider_name}</span>
        </div>
        <p className="sub" style={{ marginTop: 16, marginBottom: 0 }}>
          This title is served by an external aggregator. Launch and wallet callbacks are stubbed until a
          provider contract is connected; no stake is taken on this screen.
        </p>
      </div>

      <div className="card">
        <h2>Play on this book</h2>
        <p className="sub">Native two-sided markets are available for this provider where staff opened them.</p>
        <div className="row">
          <Link className="btn" href={`/play/casino/${game.provider_slug}`}>Open native markets</Link>
          <Link className="btn btn-ghost" href={`/play/${game.type === "slot" ? "slots" : game.type}`}>
            Back to lobby
          </Link>
        </div>
      </div>
    </>
  );
}
