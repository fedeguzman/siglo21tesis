create table if not exists profiles (
 id uuid primary key, name text not null, role text not null check(role in ('merchant','consumer')), created_at timestamptz not null default now()
);
create table if not exists shops (
 id uuid primary key, owner_id uuid not null unique references profiles(id), name text not null, phone text not null, address text not null,
 description text not null default '', latitude double precision not null check(latitude between -90 and 90), longitude double precision not null check(longitude between -180 and 180),
 pickup_hours text not null default '', active boolean not null default true
);
create table if not exists products (
 id uuid primary key, shop_id uuid not null references shops(id), name text not null, category text not null, description text not null default ''
);
create table if not exists lots (
 id uuid primary key, shop_id uuid not null references shops(id), name text not null, content text not null, category text not null,
 photo text not null default '/images/food-0.jpg', conservation text not null, original_price integer not null check(original_price>0), price integer not null check(price>0 and price<=original_price),
 total integer not null check(total>0), available integer not null check(available>=0 and available<=total),
 pickup_start timestamptz not null, pickup_end timestamptz not null check(pickup_end>pickup_start),
 status text not null default 'published' check(status in ('published','sold_out','closed','expired')), created_at timestamptz not null default now()
);
create table if not exists reservations (
 id uuid primary key, lot_id uuid not null references lots(id), consumer_id uuid not null references profiles(id),
 quantity integer not null check(quantity>0), unit_price integer not null check(unit_price>0), code text not null unique,
 pickup_start timestamptz not null, pickup_end timestamptz not null, status text not null default 'reserved' check(status in ('reserved','collected','cancelled','expired')),
 created_at timestamptz not null default now(), collected_at timestamptz
);
create table if not exists reservation_events (
 id bigint generated always as identity primary key, reservation_id uuid not null references reservations(id), status text not null, actor_id uuid references profiles(id), created_at timestamptz not null default now()
);
create index if not exists lots_shop_idx on lots(shop_id);
create index if not exists reservations_lot_idx on reservations(lot_id);
create index if not exists reservations_consumer_idx on reservations(consumer_id);
create index if not exists lots_expiry_idx on lots(pickup_end) where status in ('published','sold_out');
alter table profiles enable row level security;
alter table shops enable row level security;
alter table products enable row level security;
alter table lots enable row level security;
alter table reservations enable row level security;
alter table reservation_events enable row level security;
-- API-only access. No anon/authenticated policies: clients cannot bypass business transactions.
