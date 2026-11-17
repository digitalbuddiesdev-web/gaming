import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  ExchangeHome,
  type EventItem,
  type MarketItem,
  type CasinoMarketItem,
  type ProviderItem,
} from "@/components/exchange-home";

export default async function PlayHome() {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const events = await sql<EventItem>(
    `select id, name, sport, starts_at
       from sport_events
      where operator_id = $1
      order by starts_at
      limit 25`,
    [viewer.operator_id],
  );

  const markets = await sql<MarketItem>(
    `select m.id, m.event_id, m.name, m.option_a, m.option_b, m.odds
       from sport_markets m
       join sport_events e on e.id = m.event_id
      where m.operator_id = $1 and m.status = 'open'
      order by m.created_at`,
    [viewer.operator_id],
  );

  const providers = await sql<ProviderItem>(
    `select p.id, p.slug, p.name,
            (select count(*)::int from casino_markets m
              where m.provider_id = p.id and m.operator_id = $1 and m.status = 'open') as open_markets
       from casino_providers p
      order by p.sort_order, p.name`,
    [viewer.operator_id],
  );

  const casinoMarkets = await sql<CasinoMarketItem>(
    `select m.id, m.name, p.slug as provider_slug, p.name as provider_name, m.option_a, m.option_b, m.odds
       from casino_markets m
       join casino_providers p on p.id = m.provider_id
      where m.operator_id = $1 and m.status = 'open'
      order by m.created_at
      limit 10`,
    [viewer.operator_id],
  );

  return (
    <ExchangeHome
      events={events}
      markets={markets}
      casinoMarkets={casinoMarkets}
      providers={providers}
      balance={viewer.balance}
    />
  );
}
