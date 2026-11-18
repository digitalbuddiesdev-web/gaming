"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  currentAccount,
  endSession,
  hashPassword,
  startSession,
  verifyPassword,
  canAct,
  type Account,
} from "./auth";
import { one, sql } from "./db";
import { canCreateRole } from "./access.ts";
import { logActivity } from "./activity.ts";
import { consume } from "./rate-limit";
import { move } from "./ledger";
import { declareResult, placeBet as postBet } from "./casino";
import { declareSportResult as postSportResult, placeSportBet } from "./sports";

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const orNull = (form: FormData, key: string) => str(form, key) || null;

/** Only same-app player paths are accepted as a post-action redirect. */
function backTo(form: FormData, fallback: string): string {
  const value = str(form, "back");
  return /^\/play(\/[a-z0-9/-]*)?$/i.test(value) ? value : fallback;
}

async function requireStaff(): Promise<Account> {
  const viewer = await currentAccount();
  if (!viewer || viewer.role === "client") redirect("/login");
  return viewer;
}

export async function login(form: FormData) {
  const username = str(form, "username");
  const password = String(form.get("password") ?? "");

  if (!(await consume("login", 5, 1 / 60))) redirect("/login?error=rate");

  const account = await one<{ id: string; operator_id: string; password_hash: string; user_status: string; role: string }>(
    `select id, operator_id, password_hash, user_status, role from accounts where lower(username) = lower($1)`,
    [username],
  );

  if (!account || !verifyPassword(password, account.password_hash) || account.user_status !== "active") {
    redirect("/login?error=1");
  }

  await sql(`update accounts set last_login_at = now() where id = $1`, [account.id]);
  await logActivity({
    operatorId: account.operator_id,
    actorId: account.id,
    targetId: account.id,
    action: "login",
    detail: account.role,
  });
  await startSession(account.id);
  redirect(account.role === "client" ? "/play" : "/admin");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

export async function createAccount(form: FormData) {
  const viewer = await requireStaff();

  const username = str(form, "username");
  const password = String(form.get("password") ?? "");
  const requested = str(form, "role") || "client";
  if (!canCreateRole(viewer.role, requested)) redirect("/admin/new?error=You cannot create that role");
  const role = requested;
  const mode = str(form, "mode") === "demo" ? "demo" : "real";
  const creditLimit = Number(str(form, "creditLimit") || "0");
  const defaultPct = Number(str(form, "defaultPct") || "0");

  if (username.length < 3) redirect("/admin/new?error=Username must be at least 3 characters");
  if (password.length < 6) redirect("/admin/new?error=Password must be at least 6 characters");
  if (!Number.isFinite(creditLimit) || creditLimit < 0) redirect("/admin/new?error=Credit limit is not a valid number");
  if (!Number.isFinite(defaultPct) || defaultPct < 0 || defaultPct > 100) redirect("/admin/new?error=Default percent must be between 0 and 100");

  let createdId: string;
  try {
    const inserted = await sql<{ id: string }>(
      `insert into accounts
         (operator_id, parent_id, username, full_name, password_hash, role, mode,
          credit_limit, default_pct, deposit_mobile)
       values ($1, $2, $3, $4, $5, $6, $7, $8::numeric, $9::numeric, $10)
       returning id`,
      [
        viewer.operator_id,
        viewer.id,
        username,
        orNull(form, "fullName"),
        hashPassword(password),
        role,
        mode,
        creditLimit.toFixed(2),
        defaultPct.toFixed(2),
        orNull(form, "depositMobile"),
      ],
    );
    createdId = inserted[0].id;
  } catch (error) {
    const message = (error as Error).message ?? "";
    const hint = /duplicate key|unique/i.test(message) ? "Username already taken" : "Could not create account";
    redirect(`/admin/new?error=${encodeURIComponent(hint)}`);
  }

  await logActivity({
    operatorId: viewer.operator_id,
    actorId: viewer.id,
    targetId: createdId,
    action: "account_created",
    detail: `${role} ${username}`,
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function adjustBalance(form: FormData) {
  const viewer = await requireStaff();

  const accountId = str(form, "accountId");
  const kind = str(form, "kind") === "debit" ? "debit" : "credit";
  const amount = str(form, "amount");
  const description = orNull(form, "description");
  const back = `/admin/clients/${accountId}`;

  const allowed = await canAct(viewer, accountId);
  if (!allowed) redirect("/admin");

  let failure: string | null = null;
  try {
    await move({
      accountId,
      operatorId: viewer.operator_id,
      kind,
      amount,
      description,
      actorId: viewer.id,
    });
  } catch (error) {
    failure = (error as Error).message;
  }

  if (!failure) {
    await logActivity({
      operatorId: viewer.operator_id,
      actorId: viewer.id,
      targetId: accountId,
      action: `balance_${kind}`,
      detail: `${amount}${description ? ` — ${description}` : ""}`,
    });
  }

  revalidatePath(back);
  redirect(failure ? `${back}?error=${encodeURIComponent(failure)}` : back);
}

export async function setStatus(form: FormData) {
  const viewer = await requireStaff();

  const accountId = str(form, "accountId");
  const field = str(form, "field");
  const value = str(form, "value");
  const back = `/admin/clients/${accountId}`;

  const allowed = await canAct(viewer, accountId);
  if (!allowed) redirect("/admin");
  if (accountId === viewer.id) redirect(`${back}?error=You cannot lock your own account`);

  const valid =
    (field === "user_status" && (value === "active" || value === "locked")) ||
    (field === "bet_status" && (value === "open" || value === "locked"));
  if (!valid) redirect(`${back}?error=Invalid status change`);

  await sql(`update accounts set ${field} = $1 where id = $2 and operator_id = $3`, [
    value,
    accountId,
    viewer.operator_id,
  ]);

  await logActivity({
    operatorId: viewer.operator_id,
    actorId: viewer.id,
    targetId: accountId,
    action: "status_change",
    detail: `${field} -> ${value}`,
  });

  revalidatePath(back);
  redirect(back);
}

export async function placeBetAction(form: FormData) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const marketId = str(form, "marketId");
  const selection = str(form, "selection");
  const stake = str(form, "stake");
  const back = backTo(form, "/play");

  if (!(await consume("bet", 30, 0.5))) redirect(`${back}?error=Too+many+requests`);

  let failure: string | null = null;
  try {
    await postBet({
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      marketId,
      selection,
      stake,
    });
  } catch (error) {
    failure = (error as Error).message;
  }

  revalidatePath("/play");
  redirect(failure ? `${back}?error=${encodeURIComponent(failure)}` : back);
}

export async function placeSportBetAction(form: FormData) {
  const viewer = await currentAccount();
  if (!viewer) redirect("/login");

  const marketId = str(form, "marketId");
  const selection = str(form, "selection");
  const stake = str(form, "stake");
  const back = backTo(form, "/play/sports");

  if (!(await consume("bet", 30, 0.5))) redirect(`${back}?error=Too+many+requests`);

  let failure: string | null = null;
  try {
    await placeSportBet({
      operatorId: viewer.operator_id,
      accountId: viewer.id,
      marketId,
      selection,
      stake,
    });
  } catch (error) {
    failure = (error as Error).message;
  }

  revalidatePath("/play/sports");
  revalidatePath(back);
  redirect(failure ? `${back}?error=${encodeURIComponent(failure)}` : back);
}

export async function createCasinoMarket(form: FormData) {
  const viewer = await requireStaff();

  const providerId = str(form, "providerId");
  const name = str(form, "name");
  const optionA = str(form, "optionA") || "Andar";
  const optionB = str(form, "optionB") || "Bahar";
  const odds = Number(str(form, "odds") || "2");
  const back = "/admin/casinos";

  if (name.length < 2) redirect(`${back}?error=Market name must be at least 2 characters`);
  if (!Number.isFinite(odds) || odds < 1.01 || odds > 100) redirect(`${back}?error=Odds must be between 1.01 and 100`);

  const provider = await one(`select 1 from casino_providers where id = $1`, [providerId]);
  if (!provider) redirect(`${back}?error=Pick a provider`);

  try {
    await sql(
      `insert into casino_markets (operator_id, provider_id, name, option_a, option_b, odds)
       values ($1, $2, $3, $4, $5, $6::numeric)`,
      [viewer.operator_id, providerId, name, optionA, optionB, odds.toFixed(2)],
    );
  } catch (error) {
    const message = (error as Error).message ?? "";
    const hint = /duplicate key|unique/i.test(message) ? "A market with that name already exists for this provider" : "Could not create market";
    redirect(`${back}?error=${encodeURIComponent(hint)}`);
  }

  await logActivity({
    operatorId: viewer.operator_id,
    actorId: viewer.id,
    targetId: viewer.id,
    action: "market_created",
    detail: name,
  });

  revalidatePath(back);
  redirect(back);
}

export async function declareCasinoResult(form: FormData) {
  const viewer = await requireStaff();

  const marketId = str(form, "marketId");
  const winner = str(form, "winner") === "b" ? "b" : "a";
  const back = "/admin/casinos";

  if (viewer.role !== "operator_admin" && viewer.role !== "super_admin") {
    redirect(`${back}?error=Only an admin can settle a market`);
  }

  let failure: string | null = null;
  try {
    await declareResult({ operatorId: viewer.operator_id, marketId, winner, actorId: viewer.id });
  } catch (error) {
    failure = (error as Error).message;
  }

  if (!failure) {
    await logActivity({
      operatorId: viewer.operator_id,
      actorId: viewer.id,
      targetId: viewer.id,
      action: "market_settled",
      detail: `${marketId} -> ${winner}`,
    });
  }

  revalidatePath(back);
  revalidatePath("/play");
  redirect(failure ? `${back}?error=${encodeURIComponent(failure)}` : back);
}

export async function createSportEvent(form: FormData) {
  const viewer = await requireStaff();

  const name = str(form, "name");
  const sport = str(form, "sport") || "Football";
  const startsAt = str(form, "startsAt");
  const back = "/admin/sports";

  if (name.length < 3) redirect(`${back}?error=Event name must be at least 3 characters`);
  const when = startsAt ? new Date(startsAt) : new Date();
  if (Number.isNaN(when.getTime())) redirect(`${back}?error=Kick-off time is not valid`);

  await sql(
    `insert into sport_events (operator_id, name, sport, starts_at)
     values ($1, $2, $3, $4::timestamptz)`,
    [viewer.operator_id, name, sport, when.toISOString()],
  );

  await logActivity({
    operatorId: viewer.operator_id,
    actorId: viewer.id,
    targetId: viewer.id,
    action: "event_created",
    detail: name,
  });

  revalidatePath(back);
  revalidatePath("/play/sports");
  redirect(back);
}

export async function createSportMarket(form: FormData) {
  const viewer = await requireStaff();

  const eventId = str(form, "eventId");
  const name = str(form, "name");
  const optionA = str(form, "optionA");
  const optionB = str(form, "optionB");
  const odds = Number(str(form, "odds") || "2");
  const back = "/admin/sports";

  if (name.length < 2) redirect(`${back}?error=Market name must be at least 2 characters`);
  if (!optionA || !optionB) redirect(`${back}?error=Both side names are required`);
  if (!Number.isFinite(odds) || odds < 1.01 || odds > 100) redirect(`${back}?error=Odds must be between 1.01 and 100`);

  const event = await one(`select 1 from sport_events where id = $1 and operator_id = $2`, [
    eventId,
    viewer.operator_id,
  ]);
  if (!event) redirect(`${back}?error=Pick an event`);

  try {
    await sql(
      `insert into sport_markets (operator_id, event_id, name, option_a, option_b, odds)
       values ($1, $2, $3, $4, $5, $6::numeric)`,
      [viewer.operator_id, eventId, name, optionA, optionB, odds.toFixed(2)],
    );
  } catch (error) {
    const message = (error as Error).message ?? "";
    const hint = /duplicate key|unique/i.test(message) ? "That market already exists on this event" : "Could not create market";
    redirect(`${back}?error=${encodeURIComponent(hint)}`);
  }

  await logActivity({
    operatorId: viewer.operator_id,
    actorId: viewer.id,
    targetId: viewer.id,
    action: "sport_market_created",
    detail: name,
  });

  revalidatePath(back);
  revalidatePath("/play/sports");
  redirect(back);
}

export async function declareSportResult(form: FormData) {
  const viewer = await requireStaff();

  const marketId = str(form, "marketId");
  const winner = str(form, "winner") === "b" ? "b" : "a";
  const back = "/admin/sports";

  if (viewer.role !== "operator_admin" && viewer.role !== "super_admin") {
    redirect(`${back}?error=Only an admin can settle a market`);
  }

  let failure: string | null = null;
  try {
    await postSportResult({ operatorId: viewer.operator_id, marketId, winner, actorId: viewer.id });
  } catch (error) {
    failure = (error as Error).message;
  }

  if (!failure) {
    await logActivity({
      operatorId: viewer.operator_id,
      actorId: viewer.id,
      targetId: viewer.id,
      action: "sport_market_settled",
      detail: `${marketId} -> ${winner}`,
    });
  }

  revalidatePath(back);
  revalidatePath("/play/sports");
  redirect(failure ? `${back}?error=${encodeURIComponent(failure)}` : back);
}
