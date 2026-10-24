-- Extensions for time-series housekeeping.
-- TimescaleDB is deprecated on Supabase Postgres 17, so we use native range
-- partitioning managed by pg_partman, with pg_cron for scheduled jobs.

create schema if not exists partman;
create extension if not exists pg_partman with schema partman;
create extension if not exists pg_cron with schema pg_catalog;

-- Supabase grants anon/authenticated full access to every new table, sequence and
-- function in `public` by default. That is unsafe for partitioned tables: pg_partman
-- creates child partitions later, they do not inherit the parent's RLS, and the REST
-- API would expose them directly. Postgres only checks the parent's privileges when a
-- query goes through the parent, so children need no grants at all.
-- From here on every object in `public` grants access explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
