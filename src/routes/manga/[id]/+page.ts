import type { PageLoad } from './$types';
import type { MangaDetail } from '$lib/api/mangadex';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/manga/${params.id}`);
	if (!res.ok) throw new Error('Failed to load manga');
	const manga: MangaDetail = await res.json();
	return { manga };
};
