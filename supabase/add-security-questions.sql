-- Add security question columns to app_users
-- Run in Supabase SQL Editor before using the profile security questions feature.

alter table app_users
  add column if not exists security_q1 text,
  add column if not exists security_a1 text,
  add column if not exists security_q2 text,
  add column if not exists security_a2 text,
  add column if not exists security_q3 text,
  add column if not exists security_a3 text;
