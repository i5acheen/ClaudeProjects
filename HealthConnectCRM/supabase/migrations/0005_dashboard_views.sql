-- Dashboard aggregates (CLAUDE.md §8.2, §6.2 pricing note). No personal data; org-filtered like v_funnel.

-- Minutes from a patient's message to our first reply (bot or coordinator), per day (IST).
create or replace view public.v_response_times with (security_barrier) as
with firsts as (
  select
    m.lead_id,
    m.org_id,
    m.created_at as inbound_at,
    (select min(o.created_at) from public.messages o
      where o.conversation_id = m.conversation_id and o.direction = 'out'
        and o.sender in ('bot', 'coordinator') and not o.is_internal_note and o.created_at >= m.created_at) as reply_at,
    (select o.sender from public.messages o
      where o.conversation_id = m.conversation_id and o.direction = 'out'
        and o.sender in ('bot', 'coordinator') and not o.is_internal_note and o.created_at >= m.created_at
      order by o.created_at limit 1) as replied_by
  from public.messages m
  where m.direction = 'in'
    and m.org_id = public.auth_org_id()
    and public.auth_role() in ('admin', 'coordinator', 'viewer')
    and m.created_at > now() - interval '30 days'
)
select
  (date_trunc('day', inbound_at at time zone 'Asia/Kolkata'))::date as day,
  replied_by::text as replied_by,
  count(*)::int as replies,
  round(avg(extract(epoch from (reply_at - inbound_at)) / 60)::numeric, 1) as avg_minutes,
  round((percentile_cont(0.5) within group (order by extract(epoch from (reply_at - inbound_at)) / 60))::numeric, 1) as median_minutes
from firsts
where reply_at is not null
group by 1, 2;

-- Delivered template messages per month by category (Meta bills per delivered template).
create or replace view public.v_template_counts with (security_barrier) as
select
  (date_trunc('month', m.created_at at time zone 'Asia/Kolkata'))::date as month,
  coalesce(t.category::text, 'unknown') as category,
  count(*)::int as sent,
  count(*) filter (where m.status in ('delivered', 'read'))::int as delivered
from public.messages m
left join lateral (
  select category from public.wa_templates w where w.org_id = m.org_id and w.name = m.template_name limit 1
) t on true
where m.type = 'template'
  and m.org_id = public.auth_org_id()
  and public.auth_role() in ('admin', 'coordinator', 'viewer')
group by 1, 2;

-- Coordinator leaderboard: counts only, names come from profiles (staff can read those).
create or replace view public.v_coordinator_stats with (security_barrier) as
select
  p.assigned_to as user_id,
  count(*)::int as leads,
  count(*) filter (where p.reached_stage >= 1)::int as contacted,
  count(*) filter (where p.reached_stage >= 4)::int as referred,
  count(*) filter (where p.reached_stage >= 5)::int as admitted
from public.v_lead_progress p
where p.assigned_to is not null and p.created_at > now() - interval '90 days'
group by p.assigned_to;

revoke all on public.v_response_times, public.v_template_counts, public.v_coordinator_stats from anon;
grant select on public.v_response_times, public.v_template_counts, public.v_coordinator_stats to authenticated, service_role;
