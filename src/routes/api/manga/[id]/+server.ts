import { json } from '@sveltejs/kit';
import { getMangaDetail } from '$lib/api/mangadex';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const data = await getMangaDetail(params.id);
	return json(data, {
		headers: { 'Cache-Control': 'public, max-age=300' },
	});
};
