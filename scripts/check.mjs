// Money-path self-check. Runs the real ledger and casino settlement against an
// in-memory Postgres, so it never touches .data/pg and needs no running server.
//   npm run check
process.env.PG_DATA_DIR = "memory://";
delete process.env.DATABASE_URL; // never let the self-check reach Supabase

const { sql, one } = await import("../lib/db.ts");
const { placeBet, declareResult } = await import("../lib/casino.ts");
const { placeSportBet, declareSportResult } = await import("../lib/sports.ts");
const { accountReport } = await import("../lib/reports.ts");
const simActions = await import("../lib/simulated-actions.ts");
const { settleCrashCashout } = await import("../lib/round-settlement.ts");
const { evaluateRouletteBets } = await import("../lib/provably-fair.ts");

const assert = (ok, message) => {
  if (!ok) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
};

const op = (await sql(`insert into operators (slug, name) values ('check', 'Check') returning id`))[0];
const admin = (
  await sql(
    `insert into accounts (operator_id, username, password_hash, role)
     values ($1, 'checkadmin', 'x', 'operator_admin') returning id`,
    [op.id],
  )
)[0];
const user = (
  await sql(
    `insert into accounts (operator_id, parent_id, username, password_hash, role, balance)
     values ($1, $2, 'checkuser', 'x', 'client', 100) returning id`,
    [op.id, admin.id],
  )
)[0];

// Opening row so accounts.balance and the ledger start in agreement.
await sql(
  `insert into transactions (operator_id, account_id, kind, amount, closing, description, created_by)
   values ($1, $2, 'credit', 100, 100, 'opening', $3)`,
  [op.id, user.id, admin.id],
);

const provider = (
  await sql(`insert into casino_providers (slug, name) values ('check-provider', 'Check') returning id`)
)[0];
const openMarket = async (name) =>
  (
    await sql(
      `insert into casino_markets (operator_id, provider_id, name, odds)
       values ($1, $2, $3, 2) returning id`,
      [op.id, provider.id, name],
    )
  )[0];

const market = await openMarket("Check market");

await placeBet({ operatorId: op.id, accountId: user.id, marketId: market.id, selection: "a", stake: 10 });
assert(
  Number((await one(`select balance from accounts where id = $1`, [user.id])).balance) === 90,
  "stake of 10 must debit 100 -> 90",
);

const settled = await declareResult({ operatorId: op.id, marketId: market.id, winner: "a", actorId: admin.id });
assert(settled.winners === 1 && settled.losers === 0, "one winning bet must settle");
assert(
  Number((await one(`select balance from accounts where id = $1`, [user.id])).balance) === 110,
  "2x payout of 20 must credit 90 -> 110",
);

let threw = false;
try {
  await declareResult({ operatorId: op.id, marketId: market.id, winner: "a", actorId: admin.id });
} catch {
  threw = true;
}
assert(threw, "a second declaration must be refused");

await sql(`update accounts set bet_status = 'locked' where id = $1`, [user.id]);
const lockedMarket = await openMarket("Check locked market");
threw = false;
try {
  await placeBet({ operatorId: op.id, accountId: user.id, marketId: lockedMarket.id, selection: "a", stake: 5 });
} catch {
  threw = true;
}
assert(threw, "betting must be refused when bet_status is locked");

const rec = await one(
  `select a.balance,
          (select sum(case when kind = 'credit' then amount else -amount end)
             from transactions t where t.account_id = a.id) as ledger
     from accounts a where a.id = $1`,
  [user.id],
);
assert(Number(rec.balance) === Number(rec.ledger), "balance must reconcile with the ledger");

// A stake above the balance must roll back the bet row, not leave a half-written bet.
await sql(`update accounts set bet_status = 'open' where id = $1`, [user.id]);
const oversize = await openMarket("Check oversize market");
threw = false;
try {
  await placeBet({ operatorId: op.id, accountId: user.id, marketId: oversize.id, selection: "a", stake: 10000 });
} catch {
  threw = true;
}
assert(threw, "a stake above the balance must be refused");
assert(
  Number((await one(`select count(*)::int as n from bets where market_id = $1`, [oversize.id])).n) === 0,
  "a refused bet must not be inserted",
);

// Sports: same ledger path, separate table, same one-shot settlement guard.
const event = (
  await sql(
    `insert into sport_events (operator_id, name, sport, starts_at)
     values ($1, 'Check FC v Check United', 'Football', now()) returning id`,
    [op.id],
  )
)[0];
const sportMarket = (
  await sql(
    `insert into sport_markets (operator_id, event_id, name, option_a, option_b, odds)
     values ($1, $2, 'Match winner', 'Check FC', 'Check United', 2) returning id`,
    [op.id, event.id],
  )
)[0];

await placeSportBet({ operatorId: op.id, accountId: user.id, marketId: sportMarket.id, selection: "a", stake: 10 });
assert(
  Number((await one(`select balance from accounts where id = $1`, [user.id])).balance) === 100,
  "sports stake of 10 must debit 110 -> 100",
);

const sportBet = await one(
  `select market_id, sport_market_id from bets where sport_market_id = $1`,
  [sportMarket.id],
);
assert(sportBet.market_id === null && sportBet.sport_market_id === sportMarket.id, "sports bet must use only sport_market_id");

const sportSettled = await declareSportResult({
  operatorId: op.id,
  marketId: sportMarket.id,
  winner: "a",
  actorId: admin.id,
});
assert(sportSettled.winners === 1, "one winning sports bet must settle");
assert(
  Number((await one(`select balance from accounts where id = $1`, [user.id])).balance) === 120,
  "sports 2x payout of 20 must credit 100 -> 120",
);

threw = false;
try {
  await declareSportResult({ operatorId: op.id, marketId: sportMarket.id, winner: "a", actorId: admin.id });
} catch {
  threw = true;
}
assert(threw, "a second sports declaration must be refused");

threw = false;
try {
  await sql(`insert into bets (operator_id, account_id, selection, stake, odds) values ($1, $2, 'a', 1, 2)`, [
    op.id,
    user.id,
  ]);
} catch {
  threw = true;
}
assert(threw, "a bet must reference exactly one market");

// P/L and exposure come from the same rows the reports render.
const report = await accountReport({ id: admin.id, operator_id: op.id, role: "operator_admin" });
const userRow = report.find((row) => row.id === user.id);
assert(Number(userRow.pl) === 20, "P/L must be payouts minus stakes across casino and sports");
assert(Number(userRow.exposure) === 0, "settled bets must not count as exposure");

const finalRec = await one(
  `select a.balance,
          (select sum(case when kind = 'credit' then amount else -amount end)
             from transactions t where t.account_id = a.id) as ledger,
          (select coalesce(sum(case when status = 'open' then stake else 0 end), 0)
             from bets b where b.account_id = a.id) as exposure
     from accounts a where a.id = $1`,
  [user.id],
);
assert(Number(finalRec.balance) === Number(finalRec.ledger), "balance must reconcile after sports settlement");
assert(Number(finalRec.balance) - Number(finalRec.exposure) >= 0, "available balance must cover open exposure");

// Scope follows the account tree: super admin sees the operator, admins and
// agents see only their own subtree. `sibling` is deliberately rootless.
const sibling = (
  await sql(
    `insert into accounts (operator_id, parent_id, username, password_hash, role, balance)
     values ($1, null, 'checksibling', 'x', 'client', 0) returning id`,
    [op.id],
  )
)[0];
const adminRows = await accountReport({ id: admin.id, operator_id: op.id, role: "operator_admin" });
assert(
  adminRows.some((row) => row.id === user.id) && !adminRows.some((row) => row.id === sibling.id),
  "operator_admin report must cover only its own subtree",
);
const superRows = await accountReport({ id: admin.id, operator_id: op.id, role: "super_admin" });
assert(
  superRows.some((row) => row.id === user.id) && superRows.some((row) => row.id === sibling.id),
  "super_admin report must cover every account in the operator",
);

// A crash cashout must credit at most once, even if called twice for one round.
const crashRound = (
  await sql(
    `insert into simulated_game_rounds
       (operator_id, account_id, game_type, server_seed, server_seed_hash, client_seed, nonce, stake, game_data)
     values ($1, $2, 'crash', 'seed', 'hash', 'client', 1, 10, $3) returning id`,
    [op.id, user.id, JSON.stringify({ crashPoint: 2 })],
  )
)[0];
await sql(
  `insert into transactions (operator_id, account_id, kind, amount, closing, description, created_by)
   values ($1, $2, 'debit', 10, 110, 'check crash stake', $3)`,
  [op.id, user.id, admin.id],
);
await sql(`update accounts set balance = 110 where id = $1`, [user.id]);

const crashViewer = { id: user.id, operator_id: op.id };
const firstCashout = await settleCrashCashout(crashViewer, { roundId: crashRound.id, targetMultiplier: 1.5 });
assert(firstCashout.won === true && firstCashout.payout === 15, "crash cashout before the crash point must pay 10 x 1.5 = 15");
const secondCashout = await settleCrashCashout(crashViewer, { roundId: crashRound.id, targetMultiplier: 1.5 });
assert(secondCashout.alreadySettled === true, "a second cashout of the same round must be refused");
const afterCashout = await one(`select balance from accounts where id = $1`, [user.id]);
assert(Number(afterCashout.balance) === 125, "a settled crash round must credit exactly once (110 -> 125)");

// IP token bucket must allow exactly the configured burst and then refuse.
const { consume } = await import("../lib/rate-limit.ts");
const bucketChecks = [];
for (let i = 0; i < 5; i++) bucketChecks.push(await consume("check-bucket", 3, 0));
assert(
  bucketChecks.join(",") === "true,true,true,false,false",
  "token bucket must allow exactly capacity requests then refuse",
);

// Security regressions: neither money path may trust caller-supplied identity/stakes.
assert(
  !("settleCrashCashout" in simActions),
  "raw crash settlement must not be exported as a server action",
);

let rouletteThrew = false;
try {
  evaluateRouletteBets(7, [
    { type: "straight", target: 7, stake: 100 },
    { type: "straight", target: 8, stake: -99 },
  ]);
} catch {
  rouletteThrew = true;
}
assert(rouletteThrew, "a negative roulette stake must be refused");

// UI contract for the new games: shared classes and responsive rules must exist.
const { readFileSync } = await import("node:fs");
const uiCss = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
for (const cls of [
  "sim-modal-overlay",
  "sim-modal-dialog",
  "sim-modal-head",
  "sim-header-titles",
  "sim-game-badge",
  "sim-game-name",
  "sim-history-table-wrapper",
  "sim-audit-v",
  "sim-actions-stack",
]) {
  assert(uiCss.includes(`.${cls}`), `${cls} must be styled in globals.css`);
}
assert(
  /\.sim-modal-dialog[^}]*max-height[^}]*\}/.test(uiCss) &&
    /\.sim-modal-dialog[^}]*overflow-y[^}]*\}/.test(uiCss),
  "the game modal dialog must cap its height and scroll on small screens",
);
assert(
  /\.roulette-wheel-stage\s*\{[^}]*width:\s*100%[^}]*aspect-ratio:\s*1/.test(uiCss),
  "the roulette wheel must scale fluidly via width and aspect-ratio",
);
const responsiveTail = uiCss.slice(uiCss.indexOf("/* Games: responsive overrides */"));
assert(
  responsiveTail.includes("@media") &&
    responsiveTail.includes(".roulette-felt-grid") &&
    responsiveTail.includes("overflow-x: auto") &&
    responsiveTail.includes(".baccarat-hands-arena") &&
    responsiveTail.includes(".dt-battle-arena") &&
    responsiveTail.includes(".bj-actions-grid"),
  "the new games need responsive overrides after the legacy breakpoint section",
);

// --- Hierarchical RBAC, referral codes, and scoped activity ---
const { canAct, canCreateRole } = await import("../lib/access.ts");
const { findAccountByReferralCode } = await import("../lib/referral.ts");
const { activityFeed } = await import("../lib/activity.ts");

const insertAccount = async (username, role, parentId) =>
  (
    await sql(
      `insert into accounts (operator_id, parent_id, username, password_hash, role)
       values ($1, $2, $3, 'x', $4) returning id, referral_code`,
      [op.id, parentId, username, role],
    )
  )[0];

const superAdmin = await insertAccount("checksuper", "super_admin", null);
const agentA = await insertAccount("checkagenta", "agent", admin.id);
const agentB = await insertAccount("checkagentb", "agent", admin.id);
const agentAUser = await insertAccount("checkauser", "client", agentA.id);
const agentBUser = await insertAccount("checkbuser", "client", agentB.id);

const adminViewer = { id: admin.id, operator_id: op.id, role: "operator_admin" };
const superViewer = { id: superAdmin.id, operator_id: op.id, role: "super_admin" };
const agentAViewer = { id: agentA.id, operator_id: op.id, role: "agent" };
const clientViewer = { id: agentAUser.id, operator_id: op.id, role: "client" };

const adminCode = (await one(`select referral_code from accounts where id = $1`, [admin.id])).referral_code;
const userCode = (await one(`select referral_code from accounts where id = $1`, [user.id])).referral_code;
assert(adminCode && userCode, "existing accounts must have a referral code");
assert(adminCode !== userCode, "referral codes must be unique");
assert(
  (await findAccountByReferralCode(op.id, userCode.toLowerCase())).id === user.id,
  "referral lookup must be case-insensitive",
);
threw = false;
try {
  await sql(`update accounts set referral_code = 'CHANGED' where id = $1`, [user.id]);
} catch {
  threw = true;
}
assert(threw, "referral codes must be immutable");

assert(await canAct(adminViewer, agentAUser.id), "admin must reach its agent's users");
assert(await canAct(adminViewer, agentBUser.id), "admin must reach its agents' whole subtree");
assert(!(await canAct(adminViewer, sibling.id)), "admin must not reach a rootless sibling");
assert(await canAct(superViewer, sibling.id), "super admin must reach the whole operator");
assert(await canAct(agentAViewer, agentAUser.id), "agent must reach its own users");
assert(!(await canAct(agentAViewer, agentBUser.id)), "agent must not reach a sibling's users");
assert(!(await canAct(clientViewer, admin.id)), "client must not act on staff");

assert(canCreateRole("super_admin", "operator_admin"), "super admin must create admins");
assert(canCreateRole("super_admin", "agent"), "super admin must create agents");
assert(canCreateRole("super_admin", "client"), "super admin must create users");
assert(!canCreateRole("operator_admin", "operator_admin"), "admin must not create admins");
assert(canCreateRole("operator_admin", "agent"), "admin must create agents");
assert(canCreateRole("agent", "agent"), "agent must create sub-agents");
assert(canCreateRole("agent", "client"), "agent must create users");
assert(!canCreateRole("client", "client"), "client must not create users");

const betActivity = await one(`select count(*)::int as n from activity_log where target_id = $1`, [user.id]);
assert(betActivity.n > 0, "bets must write an activity row for the account");

await sql(
  `insert into activity_log (operator_id, actor_id, target_id, action, detail)
   values ($1, $2, $3, 'status_change', 'agentA user locked'),
          ($1, $4, $5, 'status_change', 'agentB user locked')`,
  [op.id, agentA.id, agentAUser.id, agentB.id, agentBUser.id],
);
const adminFeed = await activityFeed(adminViewer);
const agentAFeed = await activityFeed(agentAViewer);
const clientFeed = await activityFeed(clientViewer);
assert(
  adminFeed.some((row) => row.target_id === agentAUser.id) &&
    adminFeed.some((row) => row.target_id === agentBUser.id),
  "admin activity feed must cover its agents' whole subtree",
);
assert(
  agentAFeed.some((row) => row.target_id === agentAUser.id) &&
    !agentAFeed.some((row) => row.target_id === agentBUser.id) &&
    !agentAFeed.some((row) => row.target_id === user.id),
  "agent activity feed must only cover its own subtree",
);
assert(
  clientFeed.length > 0 && clientFeed.every((row) => row.actor_id === agentAUser.id || row.target_id === agentAUser.id),
  "client activity feed must only cover itself",
);
assert(
  (await activityFeed(adminViewer, { query: agentAUser.referral_code })).some(
    (row) => row.target_id === agentAUser.id,
  ),
  "activity feed must be searchable by referral code",
);

console.log("check: settlement, reporting, RBAC scope, referral codes, activity, rate limit OK");
