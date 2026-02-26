import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const BASE = 'https://api.mangadex.org';

export const GET: RequestHandler = async ({ url }) => {
	const sort = url.searchParams.get('sort') || 'followedCount';
	const limit = Math.min(Number(url.searchParams.get('limit') || 20), 40);
	const offset = Number(url.searchParams.get('offset') || 0);

	const orderKey =
		sort === 'rating'
			? 'order[rating]'
			: sort === 'latest'
				? 'order[latestUploadedChapter]'
				: sort === 'relevance'
					? 'order[relevance]'
					: 'order[followedCount]';

	const params = new URLSearchParams({
		[orderKey]: 'desc',
		limit: String(limit),
		offset: String(offset),
		'includes[]': 'cover_art',
		'contentRating[]': 'safe',
		hasAvailableChapters: 'true',
	});
	params.append('contentRating[]', 'suggestive');
	params.append('availableTranslatedLanguage[]', 'en');

	const res = await fetch(`${BASE}/manga?${params}`);
	if (!res.ok) throw new Error(`MangaDex popular failed: ${res.status}`);
	const data = await res.json();

	const results = data.data.map((manga: any) => {
		const cover = manga.relationships?.find((r: any) => r.type === 'cover_art');
		const coverFilename = cover?.attributes?.fileName || null;
		const title =
			manga.attributes.title?.en ||
			manga.attributes.title?.ja ||
			manga.attributes.title?.['ja-ro'] ||
			Object.values(manga.attributes.title || {})[0] ||
			'Untitled';

		return {
			id: manga.id,
			title,
			coverUrl: coverFilename
				? `/api/proxy/cover/${manga.id}/${coverFilename}.256.jpg`
				: '',
			status: manga.attributes.status || 'unknown',
			year: manga.attributes.year,
			contentRating: manga.attributes.contentRating || 'safe',
		};
	});

	return json(
		{ results, total: data.total },
		{ headers: { 'Cache-Control': 'public, max-age=600' } },
	);
};
