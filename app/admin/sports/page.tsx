import { redirect } from "next/navigation";
import { createSportEvent, createSportMarket, declareSportResult } from "@/lib/actions";
import { currentAccount, money } from "@/lib/auth";
import { sql } from "@/lib/db";

type Event = {
  id: string;
  name: string;
  sport: string;
  starts_at: string;
  markets: number;
  open_markets: number;
};

type Market = {
  id: string;
  name: string;
  event_name: string;
  sport: string;
  option_a: string;
  option_b: string;
  odds: string;
  status: "open" | "settled";
  winner: "a" | "b" | null;
  bets: number;
  open_bets: number;
  volume: string;
};

const when = (value: string) => new Date(value).toISOString().slice(0, 16).replace("T", " ");
const localInput = (value: string) => new Date(value).toISOString().slice(0, 16);

export default async function SportsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const events = await sql<Event>(
    `select e.id, e.name, e.sport, e.starts_at,
            (select count(*)::int from sport_markets m where m.event_id = e.id) as markets,
            (select count(*)::int from sport_markets m where m.event_id = e.id and m.status = 'open') as open_markets
       from sport_events e
      where e.operator_id = $1
      order by e.starts_at desc
      limit 50`,
    [viewer.operator_id],
  );

  const markets = await sql<Market>(
    `select m.id, m.name, m.option_a, m.option_b, m.odds, m.status, m.winner,
            e.name as event_name, e.sport,
            (select count(*)::int from bets b where b.sport_market_id = m.id) as bets,
            (select count(*)::int from bets b where b.sport_market_id = m.id and b.status = 'open') as open_bets,
            (select coalesce(sum(b.stake), 0) from bets b where b.sport_market_id = m.id) as volume
       from sport_markets m
       join sport_events e on e.id = m.event_id
      where m.operator_id = $1
      order by m.status = 'open' desc, m.created_at desc
      limit 100`,
    [viewer.operator_id],
  );

  const openEvents = events.filter((event) => event.open_markets > 0).concat(events.filter((event) => event.open_markets === 0));

  return (
    <>
      {error ? <div className="error">{error}</div> : null}

      <div className="card">
        <h1>Sports book</h1>
        <p className="sub">
          Create an event, add markets, then declare a winner. Settlement pays the winning side stake x odds
          once; a market can never settle twice.
        </p>

        <form action={createSportEvent}>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <div className="field" style={{ minWidth: 260 }}>
              <label htmlFor="name">Event</label>
              <input id="name" name="name" required placeholder="Vertex FC v Harbour United" />
            </div>
            <div className="field" style={{ maxWidth: 150 }}>
              <label htmlFor="sport">Sport</label>
              <input id="sport" name="sport" defaultValue="Football" />
            </div>
            <div className="field" style={{ maxWidth: 220 }}>
              <label htmlFor="startsAt">Kick-off</label>
              <input id="startsAt" name="startsAt" type="datetime-local" defaultValue={localInput(new Date().toISOString())} />
            </div>
            <div className="field" style={{ maxWidth: 120 }}>
              <button className="btn" type="submit">Create event</button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Add market</h2>
        <p className="sub">Two named outcomes, one price. The same price applies to both sides.</p>
        {events.length === 0 ? (
          <p className="muted">Create an event first.</p>
        ) : (
          <form action={createSportMarket}>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <div className="field" style={{ minWidth: 230 }}>
                <label htmlFor="eventId">Event</label>
                <select id="eventId" name="eventId" defaultValue={openEvents[0].id}>
                  {openEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} · {event.sport}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ maxWidth: 190 }}>
                <label htmlFor="marketName">Market</label>
                <input id="marketName" name="name" required placeholder="Match winner" />
              </div>
              <div className="field" style={{ maxWidth: 160 }}>
                <label htmlFor="optionA">Side 1</label>
                <input id="optionA" name="optionA" required placeholder="Vertex FC" />
              </div>
              <div className="field" style={{ maxWidth: 160 }}>
                <label htmlFor="optionB">Side 2</label>
                <input id="optionB" name="optionB" required placeholder="Harbour United" />
              </div>
              <div className="field" style={{ maxWidth: 100 }}>
                <label htmlFor="odds">Odds</label>
                <input id="odds" name="odds" type="number" step="0.01" min="1.01" max="100" defaultValue="2" />
              </div>
              <div className="field" style={{ maxWidth: 110 }}>
                <button className="btn" type="submit">Add market</button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <h2>Events</h2>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Sport</th>
              <th>Kick-off</th>
              <th className="num">Markets</th>
              <th className="num">Open</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr><td colSpan={5} className="muted">No events yet.</td></tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td>{event.name}</td>
                  <td>{event.sport}</td>
                  <td className="muted">{when(event.starts_at)}</td>
                  <td className="num">{event.markets}</td>
                  <td className="num">{event.open_markets}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Markets</h2>
        <p className="sub">Newest first. Settled markets stay visible for audit.</p>
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Market</th>
              <th>Sides</th>
              <th className="num">Odds</th>
              <th className="num">Bets</th>
              <th className="num">Volume</th>
              <th>Status</th>
              <th>Settle</th>
            </tr>
          </thead>
          <tbody>
            {markets.length === 0 ? (
              <tr><td colSpan={8} className="muted">No markets yet.</td></tr>
            ) : (
              markets.map((market) => (
                <tr key={market.id}>
                  <td>
                    {market.event_name}
                    <div className="muted">{market.sport}</div>
                  </td>
                  <td>{market.name}</td>
                  <td className="muted">{market.option_a} / {market.option_b}</td>
                  <td className="num">{Number(market.odds).toFixed(2)}</td>
                  <td className="num">
                    {market.bets}
                    {market.open_bets > 0 ? <span className="muted"> ({market.open_bets} open)</span> : null}
                  </td>
                  <td className="num">{money(market.volume)}</td>
                  <td>
                    <span className={`pill ${market.status === "open" ? "pill-active" : "pill-demo"}`}>
                      {market.status}
                    </span>
                  </td>
                  <td>
                    {market.status === "open" ? (
                      <form action={declareSportResult} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="marketId" value={market.id} />
                        <select name="winner" defaultValue="a" style={{ width: 150 }}>
                          <option value="a">{market.option_a}</option>
                          <option value="b">{market.option_b}</option>
                        </select>
                        <button className="btn btn-sm btn-ok" type="submit">Declare</button>
                      </form>
                    ) : (
                      <span className="muted">
                        {market.winner === "a" ? market.option_a : market.winner === "b" ? market.option_b : "—"} won
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
