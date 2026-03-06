alter table materials
  add column if not exists use_percentage_mode boolean not null default false;
