create extension if not exists pgcrypto;

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create unique index if not exists idx_api_keys_key_hash on public.api_keys (key_hash);
create index if not exists idx_api_keys_user_id on public.api_keys (user_id);

create table if not exists public.inspection_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  agent_id text,
  action_type text not null check (action_type in ('http_call', 'db_write', 'message', 'file_write')),
  target text,
  inbound_payload jsonb,
  outbound_payload jsonb,
  verdict text not null check (verdict in ('allow', 'mask', 'fix', 'block', 'ask')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  score integer not null,
  rules_checked integer not null default 0,
  rules_fired integer not null default 0,
  rule_fired text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_inspection_events_user_id_created_at_desc
  on public.inspection_events (user_id, created_at desc);
create index if not exists idx_inspection_events_api_key_id on public.inspection_events (api_key_id);
create index if not exists idx_inspection_events_verdict on public.inspection_events (verdict);

create table if not exists public.policy_violations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.inspection_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('error', 'warning', 'info')),
  category text not null check (category in ('pii', 'destination', 'environment', 'size', 'rate_limit', 'schema')),
  description text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  field_path text,
  original_value text,
  masked_value text,
  rule_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_policy_violations_event_id on public.policy_violations (event_id);

alter table public.api_keys enable row level security;
alter table public.inspection_events enable row level security;
alter table public.policy_violations enable row level security;

drop policy if exists "api_keys_select_own" on public.api_keys;
create policy "api_keys_select_own"
  on public.api_keys
  for select
  using (auth.uid() = user_id);

drop policy if exists "api_keys_insert_own" on public.api_keys;
create policy "api_keys_insert_own"
  on public.api_keys
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "api_keys_update_own" on public.api_keys;
create policy "api_keys_update_own"
  on public.api_keys
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "api_keys_delete_own" on public.api_keys;
create policy "api_keys_delete_own"
  on public.api_keys
  for delete
  using (auth.uid() = user_id);

drop policy if exists "inspection_events_select_own" on public.inspection_events;
create policy "inspection_events_select_own"
  on public.inspection_events
  for select
  using (auth.uid() = user_id);

drop policy if exists "inspection_events_insert_own" on public.inspection_events;
create policy "inspection_events_insert_own"
  on public.inspection_events
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "inspection_events_update_own" on public.inspection_events;
create policy "inspection_events_update_own"
  on public.inspection_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "inspection_events_delete_own" on public.inspection_events;
create policy "inspection_events_delete_own"
  on public.inspection_events
  for delete
  using (auth.uid() = user_id);

drop policy if exists "policy_violations_select_own" on public.policy_violations;
create policy "policy_violations_select_own"
  on public.policy_violations
  for select
  using (auth.uid() = user_id);

drop policy if exists "policy_violations_insert_own" on public.policy_violations;
create policy "policy_violations_insert_own"
  on public.policy_violations
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "policy_violations_update_own" on public.policy_violations;
create policy "policy_violations_update_own"
  on public.policy_violations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "policy_violations_delete_own" on public.policy_violations;
create policy "policy_violations_delete_own"
  on public.policy_violations
  for delete
  using (auth.uid() = user_id);
