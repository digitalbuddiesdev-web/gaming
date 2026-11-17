import { redirect } from "next/navigation";
import { currentAccount, money } from "@/lib/auth";
import { one, sql } from "@/lib/db";
import { PlayerShell } from "@/components/player-shell";

export default async function PlayLayout({ children }: { children: React.ReactNode }) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const exposure = await one<{ open: string }>(
    `select coalesce(sum(stake), 0) as open from bets where account_id = $1 and status = 'open'`,
    [viewer.id],
  );

  const topNavTabs = [
    { name: "HOME", href: "/play", hasIcon: false },
    { name: "CRICKET", href: "/play/sports?sport=Cricket", hasIcon: false },
    { name: "FOOTBALL", href: "/play/sports?sport=Football", hasIcon: false },
    { name: "TENNIS", href: "/play/sports?sport=Tennis", hasIcon: false },
    { name: "TABLE TENNIS", href: "/play/sports?sport=Table%20Tennis", hasIcon: false },
    { name: "CASINO", href: "/play/casino", hasIcon: false },
    { name: "LIVE CASINO", href: "/play/live", hasIcon: false },
    { name: "SLOTS", href: "/play/slots", hasIcon: false },
    { name: "VIRTUAL", href: "/play/virtual", hasIcon: false },
    { name: "FANTASY", href: "/play/fantasy", hasIcon: false },
    { name: "CRASH", href: "/play/crash", hasIcon: true },
  ];

  const tickerRows = await sql<{ id: string; name: string }>(
    `select id, name from sport_events
      where operator_id = $1
      order by starts_at
      limit 8`,
    [viewer.operator_id],
  );
  const quickTickerMatches = tickerRows.map((e) => ({
    title: e.name,
    href: `/play/sports/${e.id}`,
  }));

  return (
    <PlayerShell
      viewer={{
        username: viewer.username,
        operator_name: viewer.operator_name,
        balance: money(viewer.balance),
        mode: viewer.mode,
      }}
      exposure={money(exposure?.open ?? "0")}
      topNavTabs={topNavTabs}
      quickTickerMatches={quickTickerMatches}
    >
      {children}
    </PlayerShell>
  );
}
