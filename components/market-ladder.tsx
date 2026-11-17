import { placeBetAction, placeSportBetAction } from "@/lib/actions";

export type LadderMarket = {
  id: string;
  name: string;
  option_a: string;
  option_b: string;
  odds: string;
  status: "open" | "settled";
  winner: "a" | "b" | null;
};

/**
 * One market ladder for both the native casino round and the sports event page.
 * `kind` picks the server action; everything else is identical.
 */
export function MarketLadder({
  kind,
  markets,
  locked,
  back,
}: {
  kind: "casino" | "sports";
  markets: LadderMarket[];
  locked: boolean;
  back: string;
}) {
  if (markets.length === 0) return <p className="muted">No open markets right now.</p>;

  const action = kind === "casino" ? placeBetAction : placeSportBetAction;

  return (
    <div className="ladder">
      <p className="ladder-rule">
        <b>Stake is debited when you click a price.</b> The winning side is credited stake x odds.
      </p>
      {markets.map((m) => {
        const price = Number(m.odds).toFixed(2);

        if (m.status === "settled") {
          const won = m.winner === "a" ? m.option_a : m.option_b;
          return (
            <div key={m.id} className="ladder-row ladder-settled">
              <div className="ladder-name">
                <b>{m.name}</b>
                <span className="muted">settled</span>
              </div>
              <span className="muted">{won} won</span>
            </div>
          );
        }

        return (
          <form key={m.id} action={action} className="ladder-row">
            <input type="hidden" name="marketId" value={m.id} />
            <input type="hidden" name="back" value={back} />

            <div className="ladder-name">
              <b>{m.name}</b>
              <span className="muted">pays {price}x</span>
            </div>

            <button className="price" type="submit" name="selection" value="a" disabled={locked}>
              <span>{m.option_a}</span>
              <b>{price}</b>
            </button>
            <button className="price price-alt" type="submit" name="selection" value="b" disabled={locked}>
              <span>{m.option_b}</span>
              <b>{price}</b>
            </button>

            <input
              className="stake-input"
              name="stake"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Stake"
              required
              disabled={locked}
              aria-label={`Stake on ${m.name}`}
            />
          </form>
        );
      })}
    </div>
  );
}
