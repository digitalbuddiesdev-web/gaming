// Seeds one operator, an operator admin, a demo client, a dummy game catalog,
// native casino markets, and dummy sports events with markets.
// Run once with the dev server stopped: npm run seed
import { PGlite } from "@electric-sql/pglite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data", "pg");
const SCHEMA = path.join(process.cwd(), "db", "schema.sql");
const PASSWORD = process.env.SEED_PASSWORD || "admin12345";

const hash = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;
};

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new PGlite(DATA_DIR);
await db.waitReady;
await db.exec(fs.readFileSync(SCHEMA, "utf8"));

const operator = (
  await db.query(
    `insert into operators (slug, name) values ($1, $2)
     on conflict (slug) do update set name = excluded.name
     returning id`,
    ["demo", "Club-8910"],
  )
).rows[0];

const admin = (
  await db.query(
    `insert into accounts (operator_id, username, full_name, password_hash, role)
     values ($1, $2, $3, $4, 'operator_admin')
     on conflict (operator_id, username) do update set password_hash = excluded.password_hash
     returning id`,
    [operator.id, "admin", "Operator Admin", hash(PASSWORD)],
  )
).rows[0];

const superadmin = (
  await db.query(
    `insert into accounts (operator_id, username, full_name, password_hash, role)
     values ($1, $2, $3, $4, 'super_admin')
     on conflict (operator_id, username) do update set password_hash = excluded.password_hash, role = 'super_admin'
     returning id`,
    [operator.id, "superadmin", "Super Admin", hash(PASSWORD)],
  )
).rows[0];

const demoUser = (
  await db.query(
    `insert into accounts (operator_id, parent_id, username, full_name, password_hash, role, mode, balance)
     values ($1, $2, $3, $4, $5, 'client', 'demo', 1500)
     on conflict (operator_id, username) do update set mode = 'demo'
     returning id, (xmax = 0) as inserted`,
    [operator.id, admin.id, "demouser", "Demo Client", hash(PASSWORD)],
  )
).rows[0];

// Give the demo client a matching opening ledger row, but only on first insert.
if (demoUser.inserted) {
  await db.query(
    `insert into transactions (operator_id, account_id, kind, amount, closing, description, created_by)
     values ($1, $2, 'credit', 1500, 1500, 'Demo opening balance', $3)`,
    [operator.id, demoUser.id, admin.id],
  );
}

// Dummy vendors. None of these names are taken from the reference site.
const providers = [
  ["diamond-exchange", "Diamond Exchange", 10],
  ["sapphire-live", "Sapphire Live", 20],
  ["royal-table", "Royal Table", 30],
  ["velocity-virtual", "Velocity Virtual", 40],
  ["orbit-play", "OrbitPlay", 50],
  ["nova-live", "NovaLive", 60],
  ["crystal-works", "CrystalWorks", 70],
  ["spade-house", "SpadeHouse", 80],
];

for (const [slug, name, sort] of providers) {
  await db.query(
    `insert into casino_providers (slug, name, sort_order) values ($1, $2, $3)
     on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order`,
    [slug, name, sort],
  );
}

// Drop the original placeholder providers if nothing references them.
await db.query(
  `delete from casino_providers p
    where p.slug in ('andar-bahar', 'roulette', 'teen-patti', 'dragon-tiger')
      and not exists (select 1 from casino_markets m where m.provider_id = p.id)
      and not exists (select 1 from casino_games g where g.provider_id = p.id)`,
);

const providerIds = Object.fromEntries(
  (await db.query(`select id, slug from casino_providers`)).rows.map((row) => [row.slug, row.id]),
);

// Provider-served catalog: live, slot, virtual, fantasy.
const games = [
  ["diamond-exchange", "crimson-cove", "Crimson Cove", "live", "Table", 10],
  ["diamond-exchange", "nine-lanterns", "Nine Lanterns", "live", "Table", 20],
  ["diamond-exchange", "silver-tide", "Silver Tide", "live", "Roulette", 30],
  ["diamond-exchange", "velvet-crown", "Velvet Crown", "live", "Cards", 40],
  ["sapphire-live", "midnight-bazaar", "Midnight Bazaar", "live", "Cards", 50],
  ["sapphire-live", "golden-kite", "Golden Kite", "live", "Roulette", 60],
  ["sapphire-live", "amber-court", "Amber Court", "live", "Table", 70],
  ["royal-table", "paper-tiger", "Paper Tiger", "live", "Cards", 80],
  ["royal-table", "royal-ember", "Royal Ember", "live", "Roulette", 90],
  ["royal-table", "moonlit-vault", "Moonlit Vault", "live", "Table", 100],
  ["nova-live", "neon-harbor", "Neon Harbor", "live", "Table", 110],
  ["nova-live", "silk-road", "Silk Road", "live", "Cards", 120],
  ["nova-live", "cloud-nine", "Cloud Nine", "live", "Roulette", 130],

  ["orbit-play", "neon-orchard", "Neon Orchard", "slot", "Slots", 10],
  ["orbit-play", "copper-comet", "Copper Comet", "slot", "Slots", 20],
  ["orbit-play", "lucky-lighthouse", "Lucky Lighthouse", "slot", "Slots", 30],
  ["orbit-play", "pixel-parade", "Pixel Parade", "slot", "Slots", 40],
  ["orbit-play", "rocket-rooster", "Rocket Rooster", "slot", "Arcade", 50],
  ["crystal-works", "jade-serpent", "Jade Serpent", "slot", "Slots", 60],
  ["crystal-works", "frost-fair", "Frost Fair", "slot", "Slots", 70],
  ["crystal-works", "candy-canyon", "Candy Canyon", "slot", "Slots", 80],
  ["crystal-works", "glass-kingdom", "Glass Kingdom", "slot", "Slots", 90],
  ["crystal-works", "tiny-titan", "Tiny Titan", "slot", "Arcade", 100],

  ["velocity-virtual", "turbo-league", "Turbo League", "virtual", "Football", 10],
  ["velocity-virtual", "speed-oval", "Speed Oval", "virtual", "Racing", 20],
  ["velocity-virtual", "cyber-derby", "Cyber Derby", "virtual", "Racing", 30],
  ["velocity-virtual", "quick-pitch", "Quick Pitch", "virtual", "Cricket", 40],
  ["velocity-virtual", "court-sprint", "Court Sprint", "virtual", "Basketball", 50],

  ["spade-house", "dream-xi", "Dream XI", "fantasy", "Football", 10],
  ["spade-house", "apex-picks", "Apex Picks", "fantasy", "Cricket", 20],
  ["spade-house", "pitch-wizard", "Pitch Wizard", "fantasy", "Football", 30],
  ["spade-house", "court-sage", "Court Sage", "fantasy", "Basketball", 40],
];

for (const [provider, slug, name, type, category, sort] of games) {
  await db.query(
    `insert into casino_games (provider_id, slug, name, type, category, sort_order)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (slug) do update set name = excluded.name, type = excluded.type,
       category = excluded.category, sort_order = excluded.sort_order`,
    [providerIds[provider], slug, name, type, category, sort],
  );
}

// Native two-sided markets, one per live table, so the casino game pages have
// something to price. Staff settle these; no feed is involved.
const nativeMarkets = [
  ["diamond-exchange", "Crimson Cove round", "Crimson", "Azure", 2.0],
  ["diamond-exchange", "Nine Lanterns round", "Low", "High", 1.9],
  ["sapphire-live", "Silver Tide round", "Low", "High", 2.0],
  ["royal-table", "Velvet Crown round", "Red", "Black", 2.0],
  ["nova-live", "Neon Harbor round", "Home", "Away", 1.95],
];

for (const [provider, name, optionA, optionB, odds] of nativeMarkets) {
  await db.query(
    `insert into casino_markets (operator_id, provider_id, name, option_a, option_b, odds)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (operator_id, provider_id, name) do nothing`,
    [operator.id, providerIds[provider], name, optionA, optionB, odds],
  );
}

// Dummy sports events and markets.
const events = [
  ["Vertex FC v Harbour United", "Football", 2, [
    ["Match winner", "Vertex FC", "Harbour United", 2.1],
    ["Total goals", "Over 2.5", "Under 2.5", 1.95],
    ["First goal", "Vertex FC", "Harbour United", 1.9],
  ]],
  ["Northgate Rovers v Meridian Athletic", "Football", 5, [
    ["Match winner", "Northgate Rovers", "Meridian Athletic", 2.05],
    ["Both teams score", "Yes", "No", 1.85],
  ]],
  ["Coral Coast XI v Ironwood XI", "Cricket", 8, [
    ["Match winner", "Coral Coast XI", "Ironwood XI", 2.0],
    ["Toss winner", "Coral Coast XI", "Ironwood XI", 1.95],
    ["Total sixes", "Over 9.5", "Under 9.5", 1.9],
  ]],
  ["A. Voss v R. Kalani", "Tennis", 26, [
    ["Match winner", "A. Voss", "R. Kalani", 1.8],
    ["First set", "A. Voss", "R. Kalani", 1.85],
  ]],
  ["Steelport Giants v Lumen City", "Basketball", 30, [
    ["Match winner", "Steelport Giants", "Lumen City", 1.95],
    ["Total points", "Over 180.5", "Under 180.5", 1.9],
  ]],
  ["J. Park v M. Ortega", "Table Tennis", 50, [
    ["Match winner", "J. Park", "M. Ortega", 2.0],
    ["First game", "J. Park", "M. Ortega", 1.9],
  ]],
];

for (const [name, sport, hoursAhead, markets] of events) {
  const existing = (
    await db.query(`select id from sport_events where operator_id = $1 and name = $2`, [operator.id, name])
  ).rows[0];

  const event =
    existing ??
    (
      await db.query(
        `insert into sport_events (operator_id, name, sport, starts_at)
         values ($1, $2, $3, now() + make_interval(hours => $4)) returning id`,
        [operator.id, name, sport, hoursAhead],
      )
    ).rows[0];

  for (const [market, optionA, optionB, odds] of markets) {
    await db.query(
      `insert into sport_markets (operator_id, event_id, name, option_a, option_b, odds)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (operator_id, event_id, name) do nothing`,
      [operator.id, event.id, market, optionA, optionB, odds],
    );
  }
}

console.log("Seeded.");
console.log(`  operator : demo (${operator.id})`);
console.log(`  superadmin : superadmin / ${PASSWORD}`);
console.log(`  admin      : admin / ${PASSWORD}`);
console.log(`  demo     : demouser / ${PASSWORD}`);
console.log(`  casino   : ${providers.length} providers, ${games.length} catalog games, ${nativeMarkets.length} native markets`);
console.log(`  sports   : ${events.length} events with dummy team names`);
console.log("Change the password before this reaches a real environment.");
await db.close();
