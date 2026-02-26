import type { RequestHandler } from './$types';
import { MANGAPILL_REFERER, MANGAPILL_UA } from '$lib/api/mangapill';

export const GET: RequestHandler = async ({ url }) => {
	const imageUrl = url.searchParams.get('url');
	if (!imageUrl) {
		return new Response('Missing url', { status: 400 });
	}

	const res = await fetch(imageUrl, {
		headers: {
			'User-Agent': MANGAPILL_UA,
			Referer: MANGAPILL_REFERER,
		},
	});

	if (!res.ok) {
		return new Response('Image not found', { status: res.status });
	}

	const headers = new Headers();
	headers.set('Content-Type', res.headers.get('Content-Type') || 'image/webp');
	headers.set('Cache-Control', 'public, max-age=604800, immutable');

	return new Response(res.body, { headers });
};
