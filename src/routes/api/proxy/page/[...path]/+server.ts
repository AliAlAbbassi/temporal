import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	// path comes in as: {baseUrlHost}/data/{hash}/{filename}
	// We reconstruct the full MangaDex@Home URL
	const quality = url.searchParams.get('q') || 'data';
	const path = params.path;

	// The path format: {hash}/{filename}
	// The base URL is passed as a query parameter
	const baseUrl = url.searchParams.get('base');
	if (!baseUrl) {
		return new Response('Missing base URL', { status: 400 });
	}

	const imageUrl = `${baseUrl}/${quality}/${path}`;

	const res = await fetch(imageUrl);
	if (!res.ok) {
		return new Response('Page not found', { status: res.status });
	}

	const headers = new Headers();
	headers.set('Content-Type', res.headers.get('Content-Type') || 'image/jpeg');
	headers.set('Cache-Control', 'public, max-age=604800, immutable');

	return new Response(res.body, { headers });
};
