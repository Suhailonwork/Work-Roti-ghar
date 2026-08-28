# Roti Ghar

A community platform for **Roti Ghar** — a volunteer-run initiative that packs and delivers monthly
ration kits to families in need.

The application is four things in one codebase:

| Part | What it is |
|---|---|
| **Public website** | Every page, including the homepage, is assembled from CMS blocks. No page content is hard-coded. |
| **Private community** | A members-only feed with posts, media, comments, likes, mentions, sharing and reporting. |
| **NGO management** | Beneficiaries, ration kits, distributions, contributions, expenses, documents, reminders. |
| **Admin panel** | Applications, members, moderation, finance verification, the CMS, media and audit logs. |

Live at **https://workrotighar.com** (`www.` redirects to the apex domain).

---

## Stack

- **Next.js 15** (App Router, React 19, Server Components, Server Actions)
- **TypeScript** in strict mode
- **Tailwind CSS**
- **Supabase** — Postgres, Auth, Storage
- **Recharts** for the finance charts, **dnd-kit** for block ordering, **Zod** for validation

---

## Getting started

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

Then copy the environment file and fill it in:

```bash
cp .env.example .env.local
```

| Variable | Where it comes from | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project settings → API | Safe in the browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project settings → API | Safe in the browser; RLS governs it |
| `SUPABASE_SERVICE_ROLE_KEY` | Project settings → API | **Server only.** Bypasses RLS. Never commit it |
| `NEXT_PUBLIC_SITE_URL` | Your domain | Used for canonical URLs, the sitemap and auth links |

### 3. Run the migrations

In the Supabase SQL editor, run the files in `supabase/migrations/` **in order**:

| File | What it does |
|---|---|
| `0001_schema.sql` | Tables, enums, indexes, constraints |
| `0002_functions_triggers.sql` | Auth helpers, counters, the points ledger, reminder fan-out |
| `0003_rls.sql` | Row Level Security policies for every table |
| `0004_storage.sql` | Buckets and object policies |
| `0005_seed.sql` | Site settings, the CMS homepage, a starter ration kit |
| `0006_bootstrap_admin.sql` | Promotes your account to administrator — see below |
| `0007_member_visibility.sql` | Opens the contribution ledger and ration records to members; makes every finance and distribution write admin-only |
| `0008_demo_data.sql` | **Optional.** Sample members, families, distributions, contributions and expenses so every screen has something to show |
| `0009_fix_contribution_points.sql` | Revokes a contribution's points when the contribution is deleted, and clears strays left by earlier deletions |
| `0010_seo_workrotighar.sql` | On-page SEO for the `workrotighar` brand: site-wide SEO defaults, homepage meta/Open Graph/Twitter tags, and ~600 words of indexable homepage copy. Safe to re-run |
| `0011_faq_section.sql` | Homepage FAQ section (11 questions). The page emits FAQPage JSON-LD from these rows, so the markup always matches the visible answers. Run after `0010`. Safe to re-run |

`0008_demo_data.sql` is sample data, not part of the setup. Run it if you want the dashboard
populated while you look around; skip it on a database that holds real records. The eight demo
accounts cannot sign in — they have no identity row and an invalid password hash, so they exist
only as names and faces in the directory. Remove everything it created by running
`supabase/demo_data_teardown.sql`.

### 4. Create the first administrator

Signup always produces a **pending** member, and only an admin can approve anyone — so the very
first admin has to be made by hand.

1. Start the app and register at `/signup`.
2. Open `supabase/migrations/0006_bootstrap_admin.sql`, replace `change-me@example.com` with the
   email you registered, and run it in the SQL editor.
3. Sign in again — `/admin` is now available.

### 5. Run it

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint
```

---

## How the CMS works

An administrator can build and publish a page without touching code:

> **Create page → upload an image → add sections → drag them into order → set the SEO → preview → publish**

- `/admin/website` lists every page with its status.
- `/admin/website/[id]` is the editor, with four tabs: **Content**, **SEO**, **Settings**, **Versions**.
- Sections are dragged into order (`@dnd-kit`); the new order is saved immediately.
- `/preview/<slug>` renders a page exactly as the public site would, including drafts, scheduled
  pages and hidden sections. It is administrator-only.
- **Versions** snapshots the sections and SEO so a change can be rolled back. Reverting takes a
  backup first, so it is itself undoable.

### Block types

`hero` · `rich_text` · `image` · `image_text` · `hadith` · `statistics` · `cards` · `gallery` ·
`video` · `cta` · `community_posts` · `custom`

Each is declared once in **`lib/cms/blocks.ts`** — its fields, its defaults, its description. That
single declaration drives both the generic editor and the block picker. To add a new block type:

1. Add an entry to `BLOCK_DEFS` in `lib/cms/blocks.ts`.
2. Add a `case` to `components/cms/BlockRenderer.tsx`.

No other file needs to change. Unknown block types render as nothing rather than throwing, so a
live page can never be broken by a leftover block.

### The homepage is a CMS page

The seed creates a page with `is_home = true` containing the hero, the ayah, the mission, the
funding-policy notice, "How we work", live impact statistics, the gallery and both calls to action.
Rearranging or replacing any of it is an editing task, not a code change.

The **statistics** block can pull live figures straight from the distribution records, so the
numbers on the homepage keep themselves up to date.

The **community_posts** block only shows real posts to approved members. Everyone else sees an
invitation to join — the feed is private, and RLS enforces that regardless of what the block does.

---

## Security

Security is enforced in the database, not in the interface. Every table has Row Level Security, and
the UI is a convenience on top of it.

### Three independent gates

1. **`middleware.ts`** — redirects unauthenticated users, unapproved accounts and non-admins before
   a protected route renders.
2. **`requireApproved()` / `requireAdmin()`** — re-checked on the server inside each layout and page.
3. **RLS policies** — the real boundary. Even a request crafted straight against the Supabase API
   with a member's own token cannot read what the policies do not allow.

### Private contact details

`profiles` deliberately holds **only** fields that are safe to show any approved member. Phone
numbers, addresses and application notes live in a separate table, **`profile_contacts`**, whose
policy is *owner or admin only*.

This is not stylistic. RLS can restrict rows but **not columns** — had those fields stayed on
`profiles`, any member could have read every other member's phone number and address straight from
the API, no matter what the interface showed. Splitting the table is the only way to make the rule
real.

The same limit applies to `beneficiaries`, which members can now read: `phone` and `address` are
still columns on that table, so the safeguard is that every member-facing query lives in
`lib/ration/queries.ts` and selects `name`, `area` and `family_size` only. Adding a `select('*')`
against `beneficiaries` anywhere outside the admin screens would defeat it.

### What is protected

| Data | Who can read it |
|---|---|
| Beneficiary names, areas, family sizes | Approved members — shown on the dashboard and `/ration` |
| Beneficiary phones and addresses | Admins only — never selected by a member-facing query |
| Distribution records | Approved members |
| Verified contributions & expenses | Approved members — this is the ledger behind the balance |
| Pending / rejected contributions & expenses | Admins; a contributor always sees their own |
| Receipts, distribution proofs, documents | Private buckets, admins, short-lived signed URLs only |
| Member post media | Private bucket, approved members, signed URLs only |
| Phone / address / application notes | The owner and admins |
| Audit logs | Admins — and append-only: no `UPDATE` or `DELETE` policy exists |

### Privilege escalation

A member may edit their own profile, but `role`, `status`, `points`, `approved_at` and
`referred_by` are locked by the `profiles_guard_privileged` trigger — RLS cannot compare the old and
new row, so a `BEFORE UPDATE` trigger silently restores those columns for anyone who is not an
admin. Administrators also cannot change their own role or status, which stops someone locking
themselves out of `/admin`.

### The service-role key

`lib/supabase/admin.ts` is marked `import 'server-only'`, so pulling it into a client component is
a **build error**, not a runtime surprise. It is used in exactly one place — creating the auth user
during signup, when the applicant has no session yet.

### Passwords and payment data

- Passwords go straight to Supabase Auth. Nothing in this codebase reads, logs or stores one.
- **No banking password, UPI PIN, card number or CVV is ever collected**, and no column exists to
  hold one. A contribution record is an amount, a method, a transaction reference and a receipt image.
- Public payment collection is **off by default**, matching Roti Ghar's stated policy that it does
  not take donations from the public. An admin can switch it on under **Settings → Support &
  funding policy**; doing so records offers of support, and the interface says plainly that real
  money must move through a licensed payment gateway rather than through this application.

### Audit logging

Written for member approvals and rejections, role and status changes, points adjustments,
beneficiary changes, every financial edit and verification, content removal, report resolution,
CMS publishing and settings changes. Viewable at `/admin/audit-logs`.

---

## SEO

- Every public page has editable SEO title, meta description, canonical URL, OG title/description/
  image + alt text, Twitter card metadata, keywords and an index/no-index switch.
- Rendered through Next's `generateMetadata()`, falling back to site-wide defaults in
  `site_settings` when a field is left blank.
- `/sitemap.xml` lists only pages that are live **and** indexable — drafts, archived pages,
  scheduled pages whose time has not come, and anything marked no-index are all excluded.
- `/robots.txt` disallows every private area.
- The homepage emits `NGO` JSON-LD.
- Images carry alt text set in the media library.

---

## Points and leaderboards

`profiles.points` is always the sum of that member's **verified** `point_transactions` — kept in
step by a trigger, so the number and the ledger cannot disagree.

Points are awarded automatically when a distribution is recorded (credited to the volunteer who
delivered it) and when a contribution is verified. Both are reversed if the record is deleted or
un-verified. Admins can also adjust points by hand, with a reason.

Leaderboards run through the `leaderboard()` `SECURITY DEFINER` function, so no member ever needs
read access to anyone else's ledger.

---

## Project structure

```
app/
  (site)/            public website — layout, homepage, [slug], support
  (auth)/            login, signup, forgot/reset password
  (member)/          dashboard, feed, members, ration, finance, reminders, profile, notifications
  admin/             the full admin panel
  preview/[slug]/    admin-only preview of unpublished pages
  pending/           the "your application is being reviewed" screen
  sitemap.ts robots.ts
components/
  ui/                buttons, cards, inputs, modal, table, tabs, pagination, empty & error states
  site/              public header, footer, support form
  cms/               BlockRenderer + the block components
  feed/              composer, post card, interactions, comments
  members/           member card, search
  member/            member shell and navigation
  admin/             admin nav, CRUD forms, moderation controls, CMS editor
lib/
  supabase/          browser, server and service-role clients
  actions/           server actions, grouped by domain
  cms/               block catalogue, render helpers, queries
  feed/ members/ finance/ ration/   query layers
  ranges.ts          shared date-range resolution for the beneficiary views
  auth.ts audit.ts storage.ts validation.ts seo.ts utils.ts env.ts
supabase/migrations/ schema, functions, RLS, storage, seed, bootstrap, demo data
supabase/demo_data_teardown.sql  removes the demo data again
types/database.ts    hand-maintained database types
```

---

## Notes for the next developer

- **Database types are hand-maintained** in `types/database.ts`. Change the schema and this file in
  the same commit. They are written as `type` aliases rather than `interface` on purpose —
  interfaces have no implicit index signature, so `Database['public']` would fail the Supabase
  client's `GenericSchema` constraint and every query would silently resolve to `never`.
- **Embedded relations** (`select('…, author:profiles(…)')`) are not inferable while
  `Relationships` is empty in those types, so those results are cast explicitly at the call site.
  Supabase also returns an embedded row as either an object or a single-element array — the query
  layers normalise this.
- **CMS images use a plain `<img>`**, not `next/image`. An admin can paste any URL, and the image
  optimiser needs its hosts allow-listed at build time; a plain tag with explicit lazy loading has
  no such failure mode. Post media and receipts are signed URLs, where an optimiser cache key would
  be wrong anyway.
- **Chart colours are not the brand green.** Green-versus-orange is the classic red-green confusion
  pair — measured at ΔE 3–6 under protanopia, against ΔE 24.7 for the blue/orange actually used.
  The brand green stays in the page chrome, where nothing depends on telling it apart from another
  colour.
- `@supabase/ssr` and `@supabase/supabase-js` are pinned together. Older `ssr` releases pass their
  generics positionally into a `SupabaseClient` whose signature has since changed, which lands the
  schema in the wrong slot and collapses every row type to `never`. If types suddenly go `never`
  after an upgrade, check these two versions first.

---

## Deployment

1. Push to GitHub and import the repository into Vercel (or any Node host).
2. Set the four environment variables. `SUPABASE_SERVICE_ROLE_KEY` must **not** be prefixed with
   `NEXT_PUBLIC_`.
3. Point `workrotighar.com` at the deployment. `next.config.mjs` already redirects
   `www.workrotighar.com` to the apex domain permanently.
4. In Supabase → Authentication → URL Configuration, set the site URL and add
   `https://workrotighar.com/auth/callback` as a redirect URL.
