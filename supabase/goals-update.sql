-- Add NDIS support category to participant_goals
alter table public.participant_goals
add column if not exists ndis_category text;
