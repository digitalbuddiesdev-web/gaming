# Reference UI notes

Observations from `allpanel9.app` (logged in as `Anand19900` for the admin side and as a
demo client for the player side), recorded so our build can match the **patterns** without
copying assets, code, logos or artwork. Screenshots are in `output/reference/`.

## Design tokens observed

| Token | Value |
| --- | --- |
| Typeface | `"Roboto Condensed", sans-serif` throughout |
| Header / chrome | `#2c3e50` dark slate |
| Primary accent | `#0088cc` sky blue |
| Border / muted | `#bbbbbb` |
| Surface | `#ffffff`, flat |
| Radius | `0px` everywhere — no rounded cards |
| Type scale | 16px body, 20px section headings, dense 12–14px inside tables |

Everything is dense, table-first, and flat. Money is right-aligned and monospaced-ish in
tables. The visual system is "bootstrap-era exchange", not a modern casino skin.

**Our build should keep the density and the flatness, not the exact palette** — we already
have a dark shell and rounded cards, and a white-label operator will supply colours.

## Player shell (every player page)

```
┌────────────────────────────────────────────────────────────────────┐
│ [logo]  [Search here]            Rules   Balance:1500  Exp:0  Demo ▾ │
├────────────────────────────────────────────────────────────────────┤
│ Home  Lottery  Cricket  Tennis  Football  TT  Baccarat  32 Cards …  │
├──────────┬─────────────────────────────────────────────────────────┤
│ Racing   │                                                          │
│ Others   │   main content                                           │
│ All      │                                                          │
│ Sports   │                                                          │
└──────────┴─────────────────────────────────────────────────────────┘
footer: Terms | Responsible Gaming | 24X7 Support | 100% SAFE | GamCare links
```

- Top strip always shows **Balance** and **Exp** (exposure from open bets) side by side.
- Account chip (`Demo ▾`) is the menu: statement, current bets, password, logout.
- Left rail groups categories: **Racing Sports**, **Others** (Our Casino, Our Virtual, Live
  Casino, Slot Game, Fantasy Game), **All Sports** (long list of ~40 sports, each with a
  count badge).
- Sport tabs across the top are shortcuts into `/all-sports/<id>`, not filters.

## Player page archetypes

### 1. Sports book (`/home`, `/all-sports/:id`)

Table per sport group. Columns: **Game | 1 | X | 2**, where each price cell shows a
**back/lay pair** stacked (e.g. `2.14 / 2.16`) — two clickable prices, not one. Rows are
events with `Home v Away / dd/mm/yyyy hh:mm`. Empty markets render `-`.

Below the sports table: a casino strip with `Game | 1 | X | 2` columns pointing at
`/casino/<slug>` and `/tp-virtual-cricket/...`.

### 2. Event page (`/game-details/:sport/:eventId`)

```
┌ game header: teams, kickoff                                ┐
├ live scorecard iframe (third-party feed, LIVE tag)         ┤
├ market ladder                                               ┤
│  market name           Back            Lay        Min/Max   │
│  Pakistan              170  180        -           100/1L   │
│  ...                            SUSPENDED                   │
├ right rail: My Bet  (Matched Bet | Odds | Stake)          ┤
```

- Each market row offers **Back** and **Lay** toggles; two price columns with size under
  each price.
- `Min: 100 Max: 10K` / `1L` shown per market.
- Suspended markets stay visible but greyed with a `SUSPENDED` flag.
- `My Bet` panel lists matched bets only; unmatched/suspended live in another tab.

### 3. Native casino game (`/casino/:slug`)

```
super over2   Rules                          Round ID: 80869676971
┌────────────────────────┬───────────────────────────────────┐
│ game iframe (dealer /   │ Bookmaker   Min:100 Max:3L        │
│ result animation)       │           Back | Lay              │
│                         │ IND      5.94 100   -             │
│                         │ Common Wicket IND  -  -  SUSPENDED│
├─────────────────────────┴───────────────────────────────────┤
│ Last Result   View All → /casino-results/:slug   [I][E][I]… │
├─────────────────────────────────────────────────────────────┤
│ My Bet      Matched Bet | Odds | Stake                      │
└─────────────────────────────────────────────────────────────┘
```

- The casino round is **not** a plain bet slip: it is a market ladder identical in
  behaviour to a sports book (back/lay, min/max, suspension), fed by the game's own
  odds. `Round ID` is shown in the header.
- `Last Result` is a strip of round outcomes (letters/symbols) with a link to full history.
- `My Bet` is the same panel used on the sports event page.

### 4. Provider lobby (`/live-casino-list/:vendor/:id`, `/slot-list`, `/fantasy-list`)

```
[EZUGI] [Evolution] [Jacktop] [CockFight] [Red Carat] [Creedroomz] [Holi]
[Popular game] [Blackjack] [Roulette] [Baccarat] [Other] [Arcade] [Marble Race]
┌────┬────┬────┬────┬────┬────┐
│card│card│card│card│card│card│   ← 12 per page, launch into iframe
└────┴────┴────┴────┴────┴────┘
```

- Two chip rows: **vendor** then **game category**.
- Tiles are images only, no text labels in the accessibility tree; each opens an iframe.
- This is the surface a third-party aggregator API replaces: vendor list → category list
  → game list → launch URL.

### 5. Casino lobby (`/casino-list/LC/4`)

Chip row for game families (All Casino, Roulette, Teenpatti, Poker, Baccarat, Dragon Tiger,
32 Cards, Andar Bahar, Lucky 7, 3 Card Judgement, Casino War, Worli, Sports, Bollywood,
Lottery, Queen, Race, Others), then a grid of ~78 tiles linking to `/casino/<slug>`.

Observed slugs: `goal2 worli3 dolidana mogambo lucky5 roulette11-13 poison poison20
joker1 joker20 joker120 teenunique teen20c btable2 ourroullete superover superover2
superover3 goal ab3 ab4 ab20 abj lucky7 lucky7eu lucky7eu2 lucky15 teen teen1 teen3 teen6
teen8 teen9 teen20 teen20b teen32 teen33 teen41 teen42 teen120 teenmuf teensin triq trio
poker poker6 poker20 baccarat baccarat2 dt6 dt20 dt202 dtl20 card32 card32eu 3cardj worli
worli2 aaa aaa2 btable lottcard cricketv3 cmatch20 queen race2 race17 race20 sicbo sicbo2
trap patti2 notenum dum10 cmeter1 ballbyball`.

## Admin panel

Top bar: `List of Clients | Assign Agent | Market Analysis | Live Market ▾ | Live Virtual
Market ▾ | Reports ▾ | Multi Login`, account menu `Anand19900 ▾`, and a client filter combo
(`All Client`) that scopes every page.

- **Live Market** = 21 casino providers, one route each (`/admin/casino/<provider>`).
- **Live Virtual Market** = 9 virtual providers (`/admin/vcasino/<code>`).
- Every game page is the same shape: a market table with `Suspended` / `Active` toggles and
  per-market min/max, plus a result entry action. Providers are listed, not edited.
- Reports are 10 fixed reports (statement, current bets, P/L, `users2` summary, …) rather
  than a query builder.
- `Pts: 0` in the admin top bar confirms the book is points-based and staff-credited.

Report columns worth matching (already noted in the data-model doc):

| Report | Columns |
| --- | --- |
| Account Statement | Date / Credit / Debit / Closing / Description / Fromto |
| Current Bets | Event Type / Event Name / User Name / M Name / Nation / U Rate / Amount / Place Date |
| Profit Loss | No / User Name / Level / Casino Pts / Sport Pts / Third Party Pts / Profit-Loss |
| `users2` | CR / Balance / Client P/L / Exposure / Available / U st / B st / Exposure Limit / Default(%) / Account Type / Action |

Commission is called **soda**; `Total Soda` heads the current-bets table.

## Third-party game API contract to require

The reference gets its casino games from an aggregator. Whatever we buy, it must supply at
minimum:

1. **Catalog** — `GET /games` → `{ vendorId, vendorName, gameId, gameName, category,
   thumbnailUrl, type: "live" | "slot" | "virtual" | "fantasy" }`. Cached in a table, never
   fetched per page view.
2. **Launch** — `POST /launch` → signed, short-lived `launchUrl` bound to
   `(operatorId, accountId, gameId, currency, language)` plus our session token. We open it
   in an iframe or a new tab; the game must never receive our password.
3. **Wallet callback** — the aggregator calls *us*: `POST /api/wallet/{balance,debit,credit,rollback}`
   with a unique `transactionId` and an `HMAC` header. Idempotency on `transactionId` is
   mandatory — this is our existing `transactions` ledger with an external reference column.
4. **Results** — either a `GET /history` poll or a `result` webhook, so a bet can settle
   without staff action. Until then our manual `declareResult` stays the source of truth.
5. **Reconciliation** — a daily `GET /statement?from&to` we can diff against our ledger.

Design consequence: for provider-integrated games we do **not** hold the stake as a bet
row. The aggregator debits the wallet, so the ledger becomes the record and `bets` stays
for our own native two-sided markets. That needs an `external_ref text unique` column on
`transactions` (planned, not built).

## Deliberately not copied

Logos, provider naming, colour scheme, artwork, thumbnails, the `ALLPANELEXCH` branding, and
the specific game fiction. We reuse layout archetypes: shell + left rail, dense market
tables with back/lay, provider-tab lobby, statement-first history.
