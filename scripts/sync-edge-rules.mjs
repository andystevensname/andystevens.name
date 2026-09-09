// Reconcile the edge configuration declared in edge-rules.mjs onto the apex
// pull zone as Bunny Edge Rules.
//
//   node scripts/sync-edge-rules.mjs            apply
//   node scripts/sync-edge-rules.mjs --dry-run  print payloads, send nothing
//   node scripts/sync-edge-rules.mjs --dump     print the zone's current rules
//
// Env:
//   BUNNY_API_KEY        account API key (same one deploy-edge-script.mjs uses)
//   BUNNY_PULL_ZONE_ID   numeric id of the apex pull zone
//
// Rules are matched by Description, which is therefore the stable key: a
// declaration whose description already exists is updated in place via its
// Guid rather than added again. Change a description and you get a second
// rule, not a renamed one — so treat them as identifiers.
//
// This only ever touches rules it can account for. Rules on the zone with
// no matching declaration are reported and left alone, because the zone is
// also configured by hand and this script has no business deleting what it
// did not create.

import { redirects, browserCache, HOST } from '../edge-rules.mjs';

const API = 'https://api.bunny.net';
const key = process.env.BUNNY_API_KEY;
const zoneId = process.env.BUNNY_PULL_ZONE_ID;
const dryRun = process.argv.includes('--dry-run');
const dump = process.argv.includes('--dump');

if (!key) {
  console.error('BUNNY_API_KEY not set');
  process.exit(1);
}
if (!zoneId) {
  console.error('BUNNY_PULL_ZONE_ID not set');
  process.exit(1);
}

async function api(path, method = 'GET', body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      AccessKey: key,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path}: ${res.status} ${res.statusText} ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

// ActionType 1 = Redirect, trigger Type 0 = Url, and both matching types
// 0 = MatchAny — all documented in the OpenAPI spec.
//
// What is NOT documented is where a Redirect action carries its status
// code: the spec describes ActionParameter1..3 only as "depends on the
// action type". ActionParameter1 is the destination and ActionParameter2
// appears to be the status code. Run --dump against a rule built by hand
// in the dashboard to confirm the encoding before trusting this.
function rule({ description, paths, actionType, param1, param2 }, guid) {
  return {
    Guid: guid ?? null,
    ActionType: actionType,
    ActionParameter1: param1,
    ActionParameter2: param2 ?? null,
    Description: description,
    Enabled: true,
    TriggerMatchingType: 0,
    Triggers: [
      {
        Type: 0, // Url
        PatternMatchingType: 0, // MatchAny
        PatternMatches: paths.map((path) => `*://${HOST}${path}`),
        Parameter1: null,
      },
    ],
  };
}

// ActionType 1 = Redirect, 16 = OverrideBrowserCacheTime; trigger Type 0 =
// Url and both matching types 0 = MatchAny. Those are documented.
//
// What is NOT documented is what a Redirect action does with its status
// code — the spec describes ActionParameter1..3 only as "depends on the
// action type". ActionParameter2 is the best reading. Likewise
// OverrideBrowserCacheTime takes its duration in ActionParameter1, in
// seconds, which is consistent but unconfirmed. Run --dump against rules
// built by hand in the dashboard to check both before trusting them.
const declaredRules = [
  ...redirects.map((r) => ({
    description: r.description,
    paths: r.from,
    actionType: 1,
    param1: r.to,
    param2: String(r.status),
  })),
  ...browserCache.map((c) => ({
    description: c.description,
    paths: c.paths,
    actionType: 16,
    param1: String(c.seconds),
  })),
];

const zone = await api(`/pullzone/${zoneId}`);
const existing = zone.EdgeRules ?? [];

if (dump) {
  console.log(`Pull zone ${zoneId} (${zone.Name}) has ${existing.length} edge rule(s):`);
  console.log(JSON.stringify(existing, null, 2));
  process.exit(0);
}

const declared = new Set(declaredRules.map((r) => r.description));
const unmanaged = existing.filter((r) => !declared.has(r.Description));
if (unmanaged.length) {
  console.log(`Leaving ${unmanaged.length} rule(s) alone (not declared here):`);
  for (const r of unmanaged) console.log(`  - ${r.Description || '(no description)'}`);
}

let added = 0;
let updated = 0;
for (const declaredRule of declaredRules) {
  const match = existing.find((r) => r.Description === declaredRule.description);
  const payload = rule(declaredRule, match?.Guid);

  if (dryRun) {
    console.log(`${match ? 'update' : 'add'}  ${declaredRule.description}`);
    console.log(JSON.stringify(payload, null, 2));
    continue;
  }

  await api(`/pullzone/${zoneId}/edgerules/addOrUpdate`, 'POST', payload);
  if (match) updated += 1;
  else added += 1;
  console.log(`  ${match ? 'updated' : 'added'}: ${declaredRule.description}`);
}

console.log(
  dryRun
    ? `Dry run: ${declaredRules.length} rule(s) would be applied to pull zone ${zoneId}.`
    : `Edge rules synced: ${added} added, ${updated} updated.`
);
