import { json } from '@sveltejs/kit';
import { searchManga } from '$lib/api/mangadex';
import { searchManga as searchMangaPill } from '$lib/api/mangapill';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) {
		return json({ results: [], total: 0 });
	}

	const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
	const source = url.searchParams.get('source');

	if (source === 'mangapill') {
		const data = await searchMangaPill(query, limit);
		return json(data, {
			headers: { 'Cache-Control': 'public, max-age=300' },
		});
	}

	if (source === 'mangadex') {
		const offset = Number(url.searchParams.get('offset') || 0);
		const data = await searchManga(query, limit, offset);
		return json(data, {
			headers: { 'Cache-Control': 'public, max-age=300' },
		});
	}

	// Default: search both sources in parallel
	const [mdxResult, mpResult] = await Promise.allSettled([
		searchManga(query, limit),
		searchMangaPill(query, limit),
	]);

	const results = [];
	if (mdxResult.status === 'fulfilled') {
		results.push(...mdxResult.value.results);
	}
	if (mpResult.status === 'fulfilled') {
		results.push(...mpResult.value.results);
	}

	return json(
		{ results, total: results.length },
		{ headers: { 'Cache-Control': 'public, max-age=300' } },
	);
};
