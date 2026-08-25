#!/usr/bin/env node
/**
 * Check candidate extension names against the live VS Code Marketplace.
 *
 * Run this BEFORE settling on a name. Marketplace identifiers are unique and stay
 * reserved even after an extension is removed, and a display-name clash in the same
 * category is just as damaging as a hard conflict — users cannot tell you apart.
 *
 *   node scripts/check-name.mjs yoke radar flightdeck
 */

const API = 'https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery';

async function search(term) {
	const res = await fetch(API, {
		method: 'POST',
		headers: {
			Accept: 'application/json;api-version=3.0-preview.1',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			filters: [{
				criteria: [
					{ filterType: 10, value: term },
					{ filterType: 8, value: 'Microsoft.VisualStudio.Code' },
				],
				pageSize: 10,
				pageNumber: 1,
			}],
			flags: 914,
		}),
	});
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}
	const data = await res.json();
	return (data.results?.[0]?.extensions ?? []).map((e) => ({
		name: e.extensionName,
		display: e.displayName ?? '',
		publisher: e.publisher?.publisherName ?? '',
		installs: Number(e.statistics?.find((s) => s.statisticName === 'install')?.value ?? 0),
	}));
}

/** A hit counts as a clash when it owns the bare word, not merely contains it. */
function isClash(hit, term) {
	const t = term.toLowerCase();
	const display = hit.display.toLowerCase();
	return (
		hit.name.toLowerCase() === t ||
		display === t ||
		[' ', '-', ':', '.'].some((sep) => display.startsWith(t + sep))
	);
}

const terms = process.argv.slice(2);
if (terms.length === 0) {
	console.log('\nUsage: node scripts/check-name.mjs <name> [name...]\n');
	process.exit(1);
}

let anyClash = false;
for (const term of terms) {
	try {
		const hits = await search(term);
		const clashes = hits.filter((h) => isClash(h, term));
		if (clashes.length) {
			anyClash = true;
		}
		const verdict = clashes.length ? 'TAKEN' : hits.length ? 'clear (near matches below)' : 'CLEAR';
		console.log(`\n${term} — ${verdict}`);
		for (const h of (clashes.length ? clashes : hits).slice(0, 4)) {
			console.log(`   ${h.publisher}.${h.name}  "${h.display}"  ${h.installs.toLocaleString()} installs`);
		}
	} catch (error) {
		anyClash = true;
		console.log(`\n${term} — query failed: ${error.message}`);
	}
}
console.log('');
process.exit(anyClash ? 1 : 0);
