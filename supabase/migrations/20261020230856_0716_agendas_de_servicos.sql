-- manifest: Agendas opt-in por serviço, programação e capacidade, preservando reservas individuais e vínculos Google existentes.
-- Operações de rede permanecem no executor Google; RPCs não fazem HTTP.

alter table public.calendar_event_types
  add column if not exists service_enabled boolean not null default false,
  add column if not exists booking_mode text not null default 'individual',
  add column if not exists service_capacity integer,
  add column if not exists service_timezone text not null default 'America/Sao_Paulo',
  add column if not exists destination_calendar_id uuid,
  add column if not exists service_publication_mode text not null default 'none',
  add column if not exists service_revision bigint not null default 1;

create unique index if not exists calendar_event_types_org_id_key on public.calendar_event_types(organization_id,id);
create unique index if not exists calendar_calendars_org_id_key on public.calendar_connection_calendars(organization_id,id);

do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.calendar_event_types'::regclass and conname='calendar_service_mode_valid') then
    alter table public.calendar_event_types add constraint calendar_service_mode_valid check(booking_mode in ('individual','collective_limited','collective_unlimited'));
    alter table public.calendar_event_types add constraint calendar_service_capacity_valid check(service_capacity is null or service_capacity between 1 and 100000);
    alter table public.calendar_event_types add constraint calendar_service_publication_valid check(service_publication_mode in ('none','service','professional'));
    alter table public.calendar_event_types add constraint calendar_service_destination_fk foreign key(organization_id,destination_calendar_id)
      references public.calendar_connection_calendars(organization_id,id) on delete set null(destination_calendar_id);
  end if;
end $$;

create table if not exists public.calendar_service_schedule (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null,
  weekday integer,
  on_date date,
  timing_kind text not null check(timing_kind in ('fixed','window')),
  start_minute integer not null check(start_minute between 0 and 1439),
  end_minute integer check(end_minute between 1 and 1440 and end_minute>start_minute),
  duration_minutes integer check(duration_minutes between 5 and 1440),
  capacity_rule text not null default 'inherit' check(capacity_rule in ('inherit','limited','unlimited')),
  capacity_limit integer check(capacity_limit between 1 and 100000),
  created_at timestamptz not null default now(),
  constraint calendar_service_schedule_type_fk foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete cascade,
  constraint calendar_service_schedule_scope_valid check((weekday is null)<>(on_date is null) and (weekday is null or weekday between 0 and 6)),
  constraint calendar_service_schedule_window_valid check(timing_kind<>'window' or end_minute is not null),
  constraint calendar_service_schedule_capacity_valid check(capacity_rule<>'limited' or capacity_limit is not null)
);
create index if not exists calendar_service_schedule_type_idx on public.calendar_service_schedule(organization_id,event_type_id,on_date,weekday);

create table if not exists public.calendar_service_professionals (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(organization_id,event_type_id,user_id),
  foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete cascade
);

create table if not exists public.calendar_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 80),
  capacity integer not null default 1 check(capacity between 1 and 100000),
  is_active boolean not null default true,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  unique(organization_id,id)
);
create table if not exists public.calendar_service_resources (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null,
  resource_id uuid not null,
  units integer not null default 1 check(units between 1 and 100000),
  primary key(organization_id,event_type_id,resource_id),
  foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete cascade,
  foreign key(organization_id,resource_id) references public.calendar_resources(organization_id,id) on delete restrict
);
create table if not exists public.calendar_service_calendar_sources (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null,
  calendar_id uuid not null,
  primary key(organization_id,event_type_id,calendar_id),
  foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete cascade,
  foreign key(organization_id,calendar_id) references public.calendar_connection_calendars(organization_id,id) on delete cascade
);

create table if not exists public.calendar_service_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  booking_mode text not null check(booking_mode in ('individual','collective_limited','collective_unlimited')),
  -- Coletiva divide uma ocorrência; individual usa o profissional real na chave.
  allocation_key uuid not null default '00000000-0000-0000-0000-000000000000',
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,event_type_id,starts_at,ends_at,allocation_key),
  foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete restrict
);
create table if not exists public.calendar_service_occurrence_resources (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null,
  resource_id uuid not null,
  units integer not null check(units between 1 and 100000),
  primary key(organization_id,occurrence_id,resource_id),
  foreign key(organization_id,occurrence_id) references public.calendar_service_occurrences(organization_id,id) on delete cascade,
  foreign key(organization_id,resource_id) references public.calendar_resources(organization_id,id) on delete restrict
);

alter table public.calendar_appointments
  add column if not exists service_occurrence_id uuid,
  add column if not exists participant_key text,
  add column if not exists participant_name text,
  add column if not exists service_booking_mode text,
  add column if not exists service_capacity_rule text,
  add column if not exists service_capacity_limit integer,
  add column if not exists service_rule_revision bigint,
  add column if not exists service_destination_calendar_id uuid,
  add column if not exists service_publication_mode text,
  add column if not exists service_requires_confirmation boolean,
  add column if not exists service_confirmed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists service_confirmed_at timestamptz,
  add column if not exists service_operation_key text,
  add column if not exists service_operation_request jsonb,
  add column if not exists service_block boolean not null default false;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.calendar_appointments'::regclass and conname='calendar_service_occurrence_fk') then
    alter table public.calendar_appointments add constraint calendar_service_occurrence_fk foreign key(organization_id,service_occurrence_id)
      references public.calendar_service_occurrences(organization_id,id) on delete restrict;
    alter table public.calendar_appointments add constraint calendar_service_appointment_destination_fk foreign key(organization_id,service_destination_calendar_id)
      references public.calendar_connection_calendars(organization_id,id) on delete set null(service_destination_calendar_id);
    alter table public.calendar_appointments add constraint calendar_service_participant_name_valid check(participant_name is null or length(participant_name) between 1 and 120);
  end if;
end $$;
create unique index if not exists calendar_service_participant_once on public.calendar_appointments(organization_id,service_occurrence_id,participant_key)
  where service_occurrence_id is not null and status in ('pending','confirmed');
create unique index if not exists calendar_service_operation_once on public.calendar_appointments(organization_id,service_operation_key)
  where service_operation_key is not null;
create index if not exists calendar_service_appointments_type_time on public.calendar_appointments(organization_id,event_type_id,starts_at,ends_at)
  where status in ('pending','confirmed');
create index if not exists calendar_service_confirmer_idx on public.calendar_appointments(service_confirmed_by_user_id);

create table if not exists public.calendar_service_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  scope_kind text not null check(scope_kind in ('service','professional','resource')),
  event_type_id uuid,
  owner_user_id uuid references auth.users(id) on delete restrict,
  resource_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null check(ends_at>starts_at),
  reason text not null check(length(trim(reason)) between 1 and 300),
  operation_key uuid not null,
  publication_appointment_id uuid references public.calendar_appointments(id) on delete restrict,
  archived_at timestamptz,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  unique(organization_id,operation_key),
  foreign key(organization_id,event_type_id) references public.calendar_event_types(organization_id,id) on delete restrict,
  foreign key(organization_id,resource_id) references public.calendar_resources(organization_id,id) on delete restrict,
  constraint calendar_service_block_scope_valid check(
    (scope_kind='service' and event_type_id is not null and owner_user_id is null and resource_id is null) or
    (scope_kind='professional' and event_type_id is null and owner_user_id is not null and resource_id is null) or
    (scope_kind='resource' and event_type_id is null and owner_user_id is null and resource_id is not null))
);
create index if not exists calendar_service_blocks_time_idx on public.calendar_service_blocks(organization_id,starts_at,ends_at) where archived_at is null;
-- Reverse lookup for FKs and the corresponding source/resource/block queries.
create index if not exists calendar_service_appointment_destination_idx on public.calendar_appointments(organization_id,service_destination_calendar_id);
create index if not exists calendar_service_destination_idx on public.calendar_event_types(organization_id,destination_calendar_id);
create index if not exists calendar_service_block_type_idx on public.calendar_service_blocks(organization_id,event_type_id);
create index if not exists calendar_service_block_resource_idx on public.calendar_service_blocks(organization_id,resource_id);
create index if not exists calendar_service_block_owner_idx on public.calendar_service_blocks(owner_user_id,organization_id);
drop index if exists public.calendar_service_block_publication_idx;
create index calendar_service_block_publication_idx on public.calendar_service_blocks(organization_id,publication_appointment_id);
create index if not exists calendar_service_sources_calendar_idx on public.calendar_service_calendar_sources(organization_id,calendar_id);
create index if not exists calendar_service_occurrence_resource_idx on public.calendar_service_occurrence_resources(organization_id,resource_id);
create index if not exists calendar_service_professional_user_idx on public.calendar_service_professionals(user_id,organization_id);
create index if not exists calendar_service_resource_reverse_idx on public.calendar_service_resources(organization_id,resource_id);
-- Links de pessoa/publicação também precisam pertencer à organização do serviço.
create unique index if not exists calendar_service_appointment_org_id_idx on public.calendar_appointments(organization_id,id);
alter table public.calendar_service_professionals drop constraint if exists calendar_service_professionals_user_id_fkey;
alter table public.calendar_service_blocks drop constraint if exists calendar_service_blocks_owner_user_id_fkey;
alter table public.calendar_service_blocks drop constraint if exists calendar_service_blocks_publication_appointment_id_fkey;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='calendar_service_professional_member_fk' and conrelid='public.calendar_service_professionals'::regclass) then
  alter table public.calendar_service_professionals add constraint calendar_service_professional_member_fk foreign key(organization_id,user_id) references public.user_organizations(organization_id,user_id) on delete cascade;end if;
 if not exists(select 1 from pg_constraint where conname='calendar_service_block_owner_member_fk' and conrelid='public.calendar_service_blocks'::regclass) then
  alter table public.calendar_service_blocks add constraint calendar_service_block_owner_member_fk foreign key(organization_id,owner_user_id) references public.user_organizations(organization_id,user_id) on delete cascade;end if;
 if not exists(select 1 from pg_constraint where conname='calendar_service_block_publication_org_fk' and conrelid='public.calendar_service_blocks'::regclass) then
  alter table public.calendar_service_blocks add constraint calendar_service_block_publication_org_fk foreign key(organization_id,publication_appointment_id) references public.calendar_appointments(organization_id,id);end if;
end $$;

-- Mutação somente pelas RPCs/handlers com ator e revisão; SELECT sob RLS para a UI.
-- As reservas novas são escritas pelas portas nativas security definer. Uma
-- escrita direta pela sessão não pode travar a linha antes da trava de estoque.
drop policy if exists service_appointments_native_insert on public.calendar_appointments;
create policy service_appointments_native_insert on public.calendar_appointments as restrictive for insert to authenticated
 with check (service_occurrence_id is null and not service_block);
drop policy if exists service_appointments_native_update on public.calendar_appointments;
create policy service_appointments_native_update on public.calendar_appointments as restrictive for update to authenticated
 using (service_occurrence_id is null and not service_block) with check (service_occurrence_id is null and not service_block);
drop policy if exists service_appointments_native_delete on public.calendar_appointments;
create policy service_appointments_native_delete on public.calendar_appointments as restrictive for delete to authenticated
 using (service_occurrence_id is null and not service_block);
do $$ declare tab text; begin
  foreach tab in array array['calendar_service_schedule','calendar_service_professionals','calendar_resources','calendar_service_resources',
    'calendar_service_calendar_sources','calendar_service_occurrences','calendar_service_occurrence_resources','calendar_service_blocks'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('drop policy if exists %I on public.%I','t