import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { sql } from "@/lib/db";

type Event = { id: string; name: string; sport: string; starts_at: string };
type Market = {
  id: string;
  event_id: string;
  name: string;
  option_a: string;
  option_b: string;
  odds: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");

export default async function SportsBook({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sport?: string; q?: string }>;
}) {
  const { error, sport, q } = await searchParams;
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const filters = ["operator_id = $1"];
  const params: string[] = [viewer.operator_id];
  if (sport) {
    params.push(sport);
    filters.push(`sport = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    filters.push(`name ilike $${params.length}`);
  }

  const events = await sql<Event>(
    `select id, name, sport, starts_at
       from sport_events
      where ${filters.join(" and ")}
      order by starts_at
      limit 40`,
    params,
  );

  const markets = await sql<Market>(
    `select m.id, m.event_id, m.name, m.option_a, m.option_b, m.odds
       from sport_markets m
       join sport_events e on e.id = m.event_id
      where m.operator_id = $1 and m.status = 'open'
      order by m.created_at`,
    [viewer.operator_id],
  );

  const byEvent = new Map<string, Market[]>();
  for (const market of markets) {
    byEvent.set(market.event_id, [...(byEvent.get(market.event_id) ?? []), market]);
  }

  return (
    <>
      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <h1>Sports book</h1>
        <p className="sub">
          Open a price to jump to the event ladder. Balance {money(viewer.balance)} · two-sided book, one price per side.
        </p>

        <table>
          <thead>
            <tr>
              <th>Game</th>
              <th>Start</th>
              <th>1</th>
              <th>X</th>
              <th>2</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="muted">No events yet. Staff can create one under Back office → Sports.</td></tr>
            ) : (
              events.map((event) => {
                const list = byEvent.get(event.id) ?? [];
                return (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/play/sports/${event.id}`}>{event.name}</Link>
                      <div className="muted">{event.sport}</div>
                    </td>
                    <td className="muted">{when(event.starts_at)}</td>
                    {[0, 1, 2].map((i) => {
                      const market = list[i];
                      return (
                        <td key={i}>
                          {market ? (
                            <div className="book-cell">
                              <Link href={`/play/sports/${event.id}`} className="book-side">
                                {market.option_a} <b>{Number(market.odds).toFixed(2)}</b>
                              </Link>
                              <Link href={`/play/sports/${event.id}`} className="book-side">
                                {market.option_b} <b>{Number(market.odds).toFixed(2)}</b>
                              </Link>
                              <span className="muted">{market.name}</span>
                            </div>
                          ) : (
                            <span className="muted">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
