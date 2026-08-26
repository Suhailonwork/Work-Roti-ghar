-- ============================================================================
-- Roti Ghar — core schema
-- ============================================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------- enum types
create type user_role       as enum ('admin', 'volunteer', 'member');
create type user_status     as enum ('pending', 'active', 'rejected', 'suspended', 'inactive');
create type application_status as enum ('pending', 'approved', 'rejected');
create type content_status  as enum ('published', 'hidden', 'removed');
create type media_type      as enum ('image', 'video');
create type report_target   as enum ('post', 'comment', 'profile');
create type report_status   as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type point_category  as enum ('contribution', 'volunteer', 'activity', 'admin', 'penalty');
create type beneficiary_status as enum ('active', 'inactive', 'archived');
create type verification_status as enum ('pending', 'verified', 'rejected');
create type expense_category as enum ('ration', 'transport', 'packaging', 'storage', 'utilities', 'other');
create type reminder_audience as enum ('all', 'members', 'volunteers', 'admins', 'selected');
create type reminder_status as enum ('draft', 'scheduled', 'sent', 'archived');
create type priority_level  as enum ('low', 'normal', 'high', 'urgent');
create type page_status     as enum ('draft', 'published', 'scheduled', 'archived');
create type notification_type as enum (
  'like', 'comment', 'reply', 'comment_like', 'mention', 'share',
  'announcement', 'approval', 'rejection', 'reminder', 'points', 'report_update', 'system'
);

-- ------------------------------------------------------------------ profiles
-- `profiles` holds only fields that are safe to show to any approved member.
-- Personally identifying contact data lives in `profile_contacts` so that row
-- level security can protect it — RLS cannot restrict individual columns, so
-- splitting the table is the only way to keep phone/address genuinely private.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  avatar_url    text,
  bio           text,
  role          user_role   not null default 'member',
  status        user_status not null default 'pending',
  referred_by   uuid references public.profiles(id) on delete set null,
  points        integer not null default 0,
  posts_count   integer not null default 0,
  joined_at     timestamptz,
  approved_at   timestamptz,
  approved_by   uuid references public.profiles(id) on delete set null,
  suspended_until timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_full_name_len check (char_length(full_name) between 2 and 120)
);
create index profiles_role_status_idx on public.profiles (role, status);
create index profiles_points_idx      on public.profiles (points desc);
create index profiles_name_trgm_idx   on public.profiles using gin (full_name gin_trgm_ops);
create index profiles_referred_by_idx on public.profiles (referred_by);

-- Private contact details: visible only to the owner and to admins.
create table public.profile_contacts (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email      text not null,
  mobile     text,
  address    text,
  reference  text,
  referred_by_name text,
  reason     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profile_contacts_email_idx on public.profile_contacts (lower(email));

-- -------------------------------------------------------- member_applications
create table public.member_applications (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  full_name    text not null,
  email        text not null,
  mobile       text,
  address      text,
  reference    text,
  referred_by_name text,
  referred_by  uuid references public.profiles(id) on delete set null,
  reason       text,
  avatar_url   text,
  status       application_status not null default 'pending',
  review_notes text,
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index member_applications_open_uidx
  on public.member_applications (profile_id) where status = 'pending';
create index member_applications_status_idx on public.member_applications (status, created_at desc);

-- --------------------------------------------------------------------- posts
create table public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles(id) on delete cascade,
  content        text not null default '',
  status         content_status not null default 'published',
  is_announcement boolean not null default false,
  is_pinned      boolean not null default false,
  shared_from    uuid references public.posts(id) on delete set null,
  like_count     integer not null default 0,
  comment_count  integer not null default 0,
  share_count    integer not null default 0,
  edited_at      timestamptz,
  removed_reason text,
  removed_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint posts_content_len check (char_length(content) <= 10000)
);
create index posts_feed_idx    on public.posts (status, created_at desc);
create index posts_author_idx  on public.posts (author_id, created_at desc);
create index posts_pinned_idx  on public.posts (is_pinned, created_at desc) where status = 'published';

create table public.post_media (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  bucket     text not null default 'community',
  path       text not null,
  type       media_type not null default 'image',
  width      integer,
  height     integer,
  duration_s integer,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index post_media_post_idx on public.post_media (post_id, position);

create table public.likes (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
create index likes_user_idx on public.likes (user_id, created_at desc);

create table public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  parent_id  uuid references public.comments(id) on delete cascade,
  content    text not null,
  status     content_status not null default 'published',
  like_count integer not null default 0,
  reply_count integer not null default 0,
  edited_at  timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comments_content_len check (char_length(content) between 1 and 4000)
);
create index comments_post_idx   on public.comments (post_id, created_at);
create index comments_parent_idx on public.comments (parent_id, created_at);
create index comments_author_idx on public.comments (author_id, created_at desc);

create table public.comment_likes (
  id         uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create table public.mentions (
  id           uuid primary key default gen_random_uuid(),
  source_type  report_target not null,
  source_id    uuid not null,
  mentioned_id uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (source_type, source_id, mentioned_id)
);
create index mentions_target_idx on public.mentions (mentioned_id, created_at desc);

-- ------------------------------------------------------------- notifications
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  actor_id    uuid references public.profiles(id) on delete set null,
  type        notification_type not null,
  title       text not null,
  body        text,
  link        text,
  entity_type text,
  entity_id   uuid,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ------------------------------------------------------------------- reports
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  target_type     report_target not null,
  target_id       uuid not null,
  reason          text not null,
  details         text,
  status          report_status not null default 'open',
  resolution_notes text,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_status_idx on public.reports (status, created_at desc);

-- -------------------------------------------------------- point_transactions
create table public.point_transactions (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles(id) on delete cascade,
  points         integer not null,
  category       point_category not null default 'activity',
  reason         text not null,
  activity_type  text,
  reference_type text,
  reference_id   uuid,
  is_verified    boolean not null default true,
  awarded_by     uuid references public.profiles(id) on delete set null,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  constraint point_transactions_nonzero check (points <> 0)
);
create index point_tx_profile_idx  on public.point_transactions (profile_id, occurred_at desc);
create index point_tx_verified_idx on public.point_transactions (is_verified, occurred_at desc);
create index point_tx_category_idx on public.point_transactions (category, occurred_at desc);

create table public.member_of_month (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  year       integer not null,
  month      integer not null check (month between 1 and 12),
  citation   text,
  selected_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (year, month)
);

-- ------------------------------------------------------------- beneficiaries
create table public.beneficiaries (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  address     text,
  area        text,
  family_size integer not null default 1 check (family_size between 1 and 60),
  notes       text,
  status      beneficiary_status not null default 'active',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index beneficiaries_status_idx on public.beneficiaries (status, created_at desc);
create index beneficiaries_name_trgm_idx on public.beneficiaries using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------- ration kits
create table public.ration_kits (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  estimated_cost numeric(12,2) not null default 0 check (estimated_cost >= 0),
  is_active      boolean not null default true,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.ration_kit_items (
  id        uuid primary key default gen_random_uuid(),
  kit_id    uuid not null references public.ration_kits(id) on delete cascade,
  item_name text not null,
  quantity  numeric(10,2) not null check (quantity > 0),
  unit      text not null default 'KG',
  position  integer not null default 0
);
create index ration_kit_items_kit_idx on public.ration_kit_items (kit_id, position);

create table public.distributions (
  id             uuid primary key default gen_random_uuid(),
  beneficiary_id uuid not null references public.beneficiaries(id) on delete restrict,
  kit_id         uuid not null references public.ration_kits(id) on delete restrict,
  quantity       integer not null default 1 check (quantity > 0),
  distributed_on date not null default current_date,
  distributed_by uuid references public.profiles(id) on delete set null,
  notes          text,
  proof_bucket   text default 'proofs',
  proof_path     text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index distributions_date_idx        on public.distributions (distributed_on desc);
create index distributions_beneficiary_idx on public.distributions (beneficiary_id, distributed_on desc);
create index distributions_by_idx          on public.distributions (distributed_by, distributed_on desc);

-- ------------------------------------------------------------------- finance
create table public.contributions (
  id                  uuid primary key default gen_random_uuid(),
  contributor_id      uuid references public.profiles(id) on delete set null,
  contributor_name    text not null,
  amount              numeric(12,2) not null check (amount > 0),
  contributed_on      date not null default current_date,
  payment_method      text not null default 'cash',
  transaction_ref     text,
  purpose             text,
  receipt_bucket      text default 'receipts',
  receipt_path        text,
  verification_status verification_status not null default 'pending',
  verified_by         uuid references public.profiles(id) on delete set null,
  verified_at         timestamptz,
  notes               text,
  source              text not null default 'internal',
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index contributions_status_idx on public.contributions (verification_status, contributed_on desc);
create index contributions_date_idx   on public.contributions (contributed_on desc);

create table public.expenses (
  id                  uuid primary key default gen_random_uuid(),
  category            expense_category not null default 'other',
  amount              numeric(12,2) not null check (amount > 0),
  spent_on            date not null default current_date,
  description         text not null,
  vendor              text,
  receipt_bucket      text default 'receipts',
  receipt_path        text,
  verification_status verification_status not null default 'pending',
  verified_by         uuid references public.profiles(id) on delete set null,
  verified_at         timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index expenses_status_idx   on public.expenses (verification_status, spent_on desc);
create index expenses_category_idx on public.expenses (category, spent_on desc);

create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  bucket      text not null default 'documents',
  path        text not null,
  mime_type   text,
  size_bytes  bigint,
  category    text,
  is_private  boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------- reminders
create table public.reminders (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text,
  audience   reminder_audience not null default 'all',
  priority   priority_level not null default 'normal',
  due_at     timestamptz,
  status     reminder_status not null default 'draft',
  sent_at    timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reminders_status_idx on public.reminders (status, created_at desc);

create table public.reminder_recipients (
  id          uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  is_read     boolean not null default false,
  read_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (reminder_id, profile_id)
);
create index reminder_recipients_profile_idx on public.reminder_recipients (profile_id, is_read);

-- ----------------------------------------------------------------------- CMS
create table public.cms_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  status       page_status not null default 'draft',
  is_home      boolean not null default false,
  publish_at   timestamptz,
  published_at timestamptz,
  version      integer not null default 1,
  created_by   uuid references public.profiles(id) on delete set null,
  updated_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint cms_pages_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
create unique index cms_pages_single_home_uidx on public.cms_pages (is_home) where is_home;
create index cms_pages_status_idx on public.cms_pages (status, updated_at desc);

create table public.cms_page_blocks (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.cms_pages(id) on delete cascade,
  block_type text not null,
  position   integer not null default 0,
  data       jsonb not null default '{}'::jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cms_page_blocks_page_idx on public.cms_page_blocks (page_id, position);

create table public.cms_seo (
  id                  uuid primary key default gen_random_uuid(),
  page_id             uuid not null unique references public.cms_pages(id) on delete cascade,
  seo_title           text,
  meta_description    text,
  canonical_url       text,
  og_title            text,
  og_description      text,
  og_image_url        text,
  og_image_alt        text,
  twitter_card        text not null default 'summary_large_image',
  twitter_title       text,
  twitter_description text,
  twitter_image_url   text,
  no_index            boolean not null default false,
  keywords            text[] not null default '{}',
  updated_at          timestamptz not null default now()
);

create table public.cms_revisions (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.cms_pages(id) on delete cascade,
  version    integer not null,
  note       text,
  snapshot   jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (page_id, version)
);
create index cms_revisions_page_idx on public.cms_revisions (page_id, version desc);

create table public.media (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null default 'public-media',
  path        text not null,
  url         text,
  filename    text not null,
  mime_type   text,
  size_bytes  bigint,
  width       integer,
  height      integer,
  alt_text    text,
  folder      text not null default 'general',
  is_public   boolean not null default true,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);
create index media_folder_idx on public.media (folder, created_at desc);

-- ------------------------------------------------------- settings & support
create table public.site_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  is_public   boolean not null default false,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now()
);

create table public.support_pledges (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text,
  phone        text,
  kind         text not null default 'in_kind',
  amount       numeric(12,2) check (amount is null or amount > 0),
  message      text,
  status       text not null default 'new',
  payment_status text,
  transaction_ref text,
  receipt_bucket text default 'receipts',
  receipt_path text,
  handled_by   uuid references public.profiles(id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index support_pledges_status_idx on public.support_pledges (status, created_at desc);

-- --------------------------------------------------------------- audit_logs
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  summary     text,
  before      jsonb,
  after       jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx  on public.audit_logs (entity_type, entity_id, created_at desc);
create index audit_logs_actor_idx   on public.audit_logs (actor_id, created_at desc);
