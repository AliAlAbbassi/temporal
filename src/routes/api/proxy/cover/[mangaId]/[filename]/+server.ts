import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const { mangaId, filename } = params;
	const url = `https://uploads.mangadex.org/covers/${mangaId}/${filename}`;

	const res = await fetch(url);
	if (!res.ok) {
		return new Response('Cover not found', { status: res.status });
	}

	const headers = new Headers();
	headers.set('Content-Type', res.headers.get('Content-Type') || 'image/jpeg');
	headers.set('Cache-Control', 'public, max-age=604800, immutable');

	return new Response(res.body, { headers });
};
