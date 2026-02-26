import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, url }) => {
	const mangaId = url.searchParams.get('manga');

	// Fetch chapter pages and optionally manga detail in parallel
	const promises: Promise<any>[] = [
		fetch(`/api/chapter/${params.chapterId}`).then((r) => r.json()),
	];

	if (mangaId) {
		promises.push(fetch(`/api/manga/${mangaId}`).then((r) => r.json()));
	}

	const [pageData, manga] = await Promise.all(promises);

	// Find this chapter in the manga's chapter list for navigation
	let chapterNumber: string | null = null;
	let prevChapterId: string | null = null;
	let nextChapterId: string | null = null;

	if (manga?.chapters) {
		const idx = manga.chapters.findIndex((ch: any) => ch.id === params.chapterId);
		if (idx !== -1) {
			chapterNumber = manga.chapters[idx].chapter;
			if (idx > 0) prevChapterId = manga.chapters[idx - 1].id;
			if (idx < manga.chapters.length - 1) nextChapterId = manga.chapters[idx + 1].id;
		}
	}

	return {
		chapterId: params.chapterId,
		pageData,
		mangaId,
		mangaTitle: manga?.title || null,
		mangaCover: manga?.coverUrl || null,
		chapterNumber,
		prevChapterId,
		nextChapterId,
	};
};
