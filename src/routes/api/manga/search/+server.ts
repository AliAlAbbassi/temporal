import { json } from '@sveltejs/kit';
import { searchManga } from '$lib/api/mangadex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q');
	if (!query) {
		return json({ results: [], total: 0 });
	}

	const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100);
	const offset = Number(url.searchParams.get('offset') || 0);

	const data = await searchManga(query, limit, offset);
	return json(data, {
		headers: { 'Cache-Control': 'public, max-age=300' },
	});
};
