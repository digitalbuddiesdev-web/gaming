-- Spine: operators (white-label tenants), the account tree, sessions, and the points ledger.
-- Idempotent so it can run on every boot until a real migration tool is worth adding.

create table if not exists operators (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists accounts (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operators(id),
  parent_id      uuid references accounts(id),
  username       text not null,
  full_name      text,
  password_hash  text not null,
  role           text not null check (role in ('super_admin', 'operator_admin', 'agent', 'client')),
  mode           text not null default 'real' check (mode in ('real', 'demo')),
  balance        numeric(18,2) not null default 0,
  credit_limit   numeric(18,2) not null default 0,
  default_pct    numeric(6,2)  not null default 0,
  exposure_limit numeric(18,2) not null default 0,
  user_status    text not null default 'active' check (user_status in ('active', 'locked')),
  bet_status     text not null default 'open'   check (bet_status   in ('open', 'locked')),
  deposit_mobile text,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  unique (operator_id, username)
);

create index if not exists accounts_tree_idx on accounts (operator_id, parent_id);

-- Public, immutable referral id. parent_id stays the single hierarchy edge;
-- this code is only a human-searchable handle for that same relationship.
alter table accounts add column if not exists referral_code text;
update accounts set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
 where referral_code is null;
alter table accounts alter column referral_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
alter table accounts alter column referral_code set not null;
create unique index if not exists accounts_referral_code_key on accounts (referral_code);

create or replace function accounts_referral_code_immutable() returns trigger
language plpgsql as $$
begin
  if new.referral_code is distinct from old.referral_code then
    raise exception 'referral_code is immutable';
  end if;
  return new;
end;
$$;
drop trigger if exists accounts_referral_code_immutable on accounts;
create trigger accounts_referral_code_immutable before update on accounts
  for each row execute function accounts_referral_code_immutable();

-- shortcut: usernames are globally unique, not per operator, so login needs no
-- tenant hint. Relax to (operator_id, lower(username)) when operators start
-- sharing a login URL.
create unique index if not exists accounts_username_key on accounts (lower(username));

create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_account_idx on sessions (account_id);

-- Append-only. `closing` is the balance after this row, so a statement can be
-- rendered without replaying history. accounts.balance is a denormalised copy
-- written inside the same transaction.
create table if not exists transactions (
  id             uuid primary key default gen_random_uuid(),
  operator_id    uuid not null references operators(id),
  account_id     uuid not null references accounts(id),
  kind           text not null check (kind in ('credit', 'debit')),
  amount         numeric(18,2) not null check (amount > 0),
  closing        numeric(18,2) not null,
  description    text,
  counterparty_id uuid references accounts(id),
  created_by     uuid references accounts(id),
  created_at     timestamptz not null default now()
);

create index if not exists transactions_account_idx on transactions (account_id, created_at desc);

-- Game catalog. Providers are global (shortcut: not per operator); markets and
-- bets are operator-scoped. Winner is declared by staff, never by a feed.
-- `casino_games` is the provider-served lobby catalog (live, slot, virtual,
-- fantasy). Launch is stubbed until an aggregator is wired in.
create table if not exists casino_providers (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order int  not null default 0
);

create table if not exists casino_games (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references casino_providers(id),
  slug        text not null unique,
  name        text not null,
  type        text not null check (type in ('live', 'slot', 'virtual', 'fantasy')),
  category    text not null default 'Popular',
  image_url   text,
  sort_order  int  not null default 0
);

create index if not exists casino_games_lobby_idx on casino_games (type, category, sort_order);

create table if not exists casino_markets (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  provider_id uuid not null references casino_providers(id),
  name        text not null,
  option_a    text not null default 'Red',
  option_b    text not null default 'Black',
  odds        numeric(8,2) not null default 2 check (odds >= 1.01),
  status      text not null default 'open' check (status in ('open', 'settled')),
  winner      text check (winner in ('a', 'b')),
  settled_by  uuid references accounts(id),
  settled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (operator_id, provider_id, name)
);

create index if not exists casino_markets_operator_idx on casino_markets (operator_id, status);

-- Sports book. Same two-sided book as casino (shortcut: not a true exchange, so
-- there is no back/lay liability model); each market has two named outcomes and
-- a single price. Result is declared by staff.
create table if not exists sport_events (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  name        text not null,
  sport       text not null default 'Football',
  starts_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists sport_events_operator_idx on sport_events (operator_id, starts_at desc);

create table if not exists sport_markets (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  event_id    uuid not null references sport_events(id) on delete cascade,
  name        text not null,
  option_a    text not null,
  option_b    text not null,
  odds        numeric(8,2) not null default 2 check (odds >= 1.01),
  status      text not null default 'open' check (status in ('open', 'settled')),
  winner      text check (winner in ('a', 'b')),
  settled_by  uuid references accounts(id),
  settled_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (operator_id, event_id, name)
);

create index if not exists sport_markets_event_idx on sport_markets (event_id, status);

-- Odds are snapshotted on the bet, so a later market edit cannot change a payout.
-- A bet belongs to exactly one market: casino OR sport.
create table if not exists bets (
  id              uuid primary key default gen_random_uuid(),
  operator_id     uuid not null references operators(id),
  account_id      uuid not null references accounts(id),
  market_id       uuid references casino_markets(id),
  sport_market_id uuid references sport_markets(id),
  selection       text not null check (selection in ('a', 'b')),
  stake           numeric(18,2) not null check (stake > 0),
  odds            numeric(8,2) not null,
  status          text not null default 'open' check (status in ('open', 'won', 'lost')),
  payout          numeric(18,2),
  placed_at       timestamptz not null default now(),
  settled_at      timestamptz,
  constraint bets_one_market check ((market_id is null) <> (sport_market_id is null))
);

-- Widen `bets` on databases created before the sports book.
alter table bets alter column market_id drop not null;
alter table bets add column if not exists sport_market_id uuid references sport_markets(id);
alter table bets drop constraint if exists bets_one_market;
alter table bets add constraint bets_one_market check ((market_id is null) <> (sport_market_id is null));

create index if not exists bets_market_idx  on bets (market_id, status);
create index if not exists bets_sport_idx   on bets (sport_market_id, status);
create index if not exists bets_account_idx on bets (account_id, placed_at desc);

-- Cryptographically secure simulated provably-fair games (Crash, Mines, Dice, Plinko, Tower)
create table if not exists simulated_game_rounds (
  id               uuid primary key default gen_random_uuid(),
  operator_id      uuid not null references operators(id),
  account_id       uuid not null references accounts(id),
  game_type        text not null check (game_type in ('crash', 'mines', 'dice', 'plinko', 'tower', 'slot', 'cards')),
  server_seed      text not null,
  server_seed_hash text not null,
  client_seed      text not null,
  nonce            int not null default 1,
  stake            numeric(18,2) not null check (stake > 0),
  multiplier       numeric(10,2),
  payout           numeric(18,2) default 0,
  status           text not null default 'active' check (status in ('active', 'won', 'lost', 'cashed_out')),
  game_data        jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  settled_at       timestamptz
);

-- Widen simulated_game_rounds for new game types (slot, cards)
alter table simulated_game_rounds drop constraint if exists simulated_game_rounds_game_type_check;
alter table simulated_game_rounds add constraint simulated_game_rounds_game_type_check check (game_type in ('crash', 'mines', 'dice', 'plinko', 'tower', 'slot', 'cards', 'roulette', 'baccarat', 'dragon_tiger'));
alter table simulated_game_rounds drop constraint if exists simulated_game_rounds_status_check;
alter table simulated_game_rounds add constraint simulated_game_rounds_status_check check (status in ('active', 'won', 'lost', 'cashed_out', 'push'));

create index if not exists sim_games_acc_idx on simulated_game_rounds (account_id, created_at desc);
create index if not exists sim_games_op_idx  on simulated_game_rounds (operator_id, game_type);

-- Activity feed. Actor and target are both indexed because a viewer sees rows
-- where either endpoint is inside their subtree. Wagers are captured by
-- triggers so no game entry point can skip logging; staff actions log explicitly.
create table if not exists activity_log (
  id          uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id),
  actor_id    uuid references accounts(id),
  target_id   uuid references accounts(id),
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists activity_log_op_idx     on activity_log (operator_id, created_at desc);
create index if not exists activity_log_target_idx on activity_log (target_id, created_at desc);
create index if not exists activity_log_actor_idx  on activity_log (actor_id, created_at desc);

create or replace function log_bet_activity() returns trigger
language plpgsql as $$
begin
  insert into activity_log (operator_id, actor_id, target_id, action, detail)
  values (new.operator_id, new.account_id, new.account_id, 'bet_placed', 'Stake ' || new.stake);
  return new;
end;
$$;
drop trigger if exists bets_activity on bets;
create trigger bets_activity after insert on bets
  for each row execute function log_bet_activity();

create or replace function log_round_activity() returns trigger
language plpgsql as $$
begin
  insert into activity_log (operator_id, actor_id, target_id, action, detail)
  values (new.operator_id, new.account_id, new.account_id, 'game_round', new.game_type || ' stake ' || new.stake);
  return new;
end;
$$;
drop trigger if exists simulated_rounds_activity on simulated_game_rounds;
create trigger simulated_rounds_activity after insert on simulated_game_rounds
  for each row execute function log_round_activity();

-- The app connects as the table owner, which bypasses RLS. Enabling it keeps any
-- future anon/authenticated key locked out until explicit policies are added.
alter table operators             enable row level security;
alter table accounts              enable row level security;
alter table sessions              enable row level security;
alter table transactions          enable row level security;
alter table casino_providers      enable row level security;
alter table casino_games          enable row level security;
alter table casino_markets        enable row level security;
alter table sport_events          enable row level security;
alter table sport_markets         enable row level security;
alter table bets                  enable row level security;
alter table simulated_game_rounds enable row level security;
alter table activity_log         enable row level security;

-- IP token bucket for Server Action throttling. tokens = -1 means the last
-- request was refused; the refill clamps it back to zero before accruing.
create table if not exists rate_limit_buckets (
  key        text primary key,
  tokens     numeric not null,
  updated_at timestamptz not null default now()
);
alter table rate_limit_buckets enable row level security;

