create table if not exists public.automation_settings (
  id integer primary key,
  automation_enabled boolean not null default true,
  updated_at timestamp with time zone not null default now()
);

insert into public.automation_settings (id, automation_enabled)
values (1, true)
on conflict (id) do nothing;

alter table public.automation_settings enable row level security;
