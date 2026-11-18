import type { Account } from "./auth";
import { sql } from "./db.ts";
import { visibleAccountScope as scopeCte, scopeParams } from "./access.ts";

export { scopeCte };

export type VisibleAccount = {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  mode: string;
  balance: string;
};

export async function visibleAccounts(viewer: Account): Promise<VisibleAccount[]> {
  return sql<VisibleAccount>(
    `${scopeCte}
     select a.id, a.username, a.full_name, a.role, a.mode, a.balance
       from accounts a
       join scope s on s.id = a.id
      order by a.role = 'client' desc, a.username`,
    scopeParams(viewer),
  );
}

export type AccountReportRow = {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  mode: string;
  balance: string;
  credit_limit: string;
  default_pct: string;
  exposure_limit: string;
  user_status: string;
  bet_status: string;
  casino_stake: string;
  casino_payout: string;
  sport_stake: string;
  sport_payout: string;
  exposure: string;
  pl: string;
};

/** One row per visible account with casino, sports, exposure and P/L totals. */
export async function accountReport(viewer: Account): Promise<AccountReportRow[]> {
  return sql<AccountReportRow>(
    `${scopeCte}
     select a.id, a.username, a.full_name, a.role, a.mode, a.balance, a.credit_limit,
            a.default_pct, a.exposure_limit, a.user_status, a.bet_status,
            coalesce(c.stake, 0) as casino_stake,
            coalesce(c.payout, 0) as casino_payout,
            coalesce(s.stake, 0) as sport_stake,
            coalesce(s.payout, 0) as sport_payout,
            coalesce(c.open_stake, 0) + coalesce(s.open_stake, 0) + coalesce(g.open_stake, 0) as exposure,
            (coalesce(c.payout, 0) + coalesce(s.payout, 0) + coalesce(g.payout, 0))
              - (coalesce(c.stake, 0) + coalesce(s.stake, 0) + coalesce(g.stake, 0)) as pl
       from accounts a
       join scope sc on sc.id = a.id
       left join (
         select account_id, sum(stake) as stake, sum(coalesce(payout, 0)) as payout,
                sum(case when status = 'open' then stake else 0 end) as open_stake
           from bets where market_id is not null
          group by account_id
       ) c on c.account_id = a.id
       left join (
         select account_id, sum(stake) as stake, sum(coalesce(payout, 0)) as payout,
                sum(case when status = 'open' then stake else 0 end) as open_stake
           from bets where sport_market_id is not null
          group by account_id
       ) s on s.account_id = a.id
       left join (
         select account_id, sum(stake) as stake, sum(coalesce(payout, 0)) as payout,
                sum(case when status = 'active' then stake else 0 end) as open_stake
           from simulated_game_rounds
          group by account_id
       ) g on g.account_id = a.id
      order by a.role = 'client' desc, a.username`,
    scopeParams(viewer),
  );
}

export type CurrentBetRow = {
  id: string;
  kind: string;
  source: string;
  market: string;
  username: string;
  mode: string;
  side: string;
  stake: string;
  odds: string;
  placed_at: string;
};

export async function currentBets(viewer: Account): Promise<CurrentBetRow[]> {
  return sql<CurrentBetRow>(
    `${scopeCte}
     select b.id, 'Casino' as kind, p.name as source, m.name as market,
            a.username, a.mode,
            case when b.selection = 'a' then m.option_a else m.option_b end as side,
            b.stake, b.odds, b.placed_at
       from bets b
       join accounts a on a.id = b.account_id
       join casino_markets m on m.id = b.market_id
       join casino_providers p on p.id = m.provider_id
      where b.status = 'open' and b.account_id in (select id from scope)
      union all
     select b.id, 'Sports', e.name, m.name,
            a.username, a.mode,
            case when b.selection = 'a' then m.option_a else m.option_b end,
            b.stake, b.odds, b.placed_at
       from bets b
       join accounts a on a.id = b.account_id
       join sport_markets m on m.id = b.sport_market_id
       join sport_events e on e.id = m.event_id
      where b.status = 'open' and b.account_id in (select id from scope)
      order by placed_at desc
      limit 200`,
    scopeParams(viewer),
  );
}
