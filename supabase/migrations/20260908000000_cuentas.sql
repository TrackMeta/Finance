-- Varias cajas: tabla de cuentas de efectivo + de qué cuenta sale/entra cada movimiento
create table if not exists public.cuentas (
  id uuid primary key,
  uid uuid default auth.uid(),
  nombre text not null,
  saldo_inicial numeric default 0,
  desde date,
  orden integer default 0,
  activa boolean default true
);
alter table public.cuentas enable row level security;
drop policy if exists p_dueno on public.cuentas;
create policy p_dueno on public.cuentas for all to authenticated using (uid = auth.uid()) with check (uid = auth.uid());
create index if not exists ix_cuentas_uid on public.cuentas(uid);

alter table public.movimientos add column if not exists cuenta_id uuid;
alter table public.movimientos add column if not exists cuenta_destino uuid;
