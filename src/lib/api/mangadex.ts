const BASE = 'https://api.mangadex.org';

export interface MangaSearchResult {
	id: string;
	title: string;
	altTitles: string[];
	description: string;
	coverUrl: string;
	status: string;
	year: number | null;
	tags: string[];
	contentRating: string;
}

export interface ChapterInfo {
	id: string;
	chapter: string | null;
	title: string | null;
	volume: string | null;
	pages: number;
	publishAt: string;
	scanlationGroup: string | null;
}

export interface MangaDetail extends MangaSearchResult {
	author: string | null;
	artist: string | null;
	chapters: ChapterInfo[];
}

export interface PageData {
	baseUrl: string;
	hash: string;
	pages: string[];
	pagesSaver: string[];
}

function extractRelationship(data: any, type: string) {
	return data.relationships?.find((r: any) => r.type === type);
}

function extractTitle(attributes: any): string {
	return (
		attributes.title?.en ||
		attributes.title?.ja ||
		attributes.title?.['ja-ro'] ||
		Object.values(attributes.title || {})[0] ||
		'Untitled'
	) as string;
}

function buildCoverUrl(mangaId: string, coverFilename: string | null, size: '256' | '512' = '256'): string {
	if (!coverFilename) return '';
	return `/api/proxy/cover/${mangaId}/${coverFilename}.${size}.jpg`;
}

export async function searchManga(query: string, limit = 20, offset = 0): Promise<{ results: MangaSearchResult[]; total: number }> {
	const params = new URLSearchParams({
		title: query,
		limit: String(limit),
		offset: String(offset),
		'includes[]': 'cover_art',
		'order[relevance]': 'desc',
		'contentRating[]': 'safe',
	});
	// Add additional content ratings
	params.append('contentRating[]', 'suggestive');

	const res = await fetch(`${BASE}/manga?${params}`);
	if (!res.ok) throw new Error(`MangaDex search failed: ${res.status}`);
	const json = await res.json();

	const results: MangaSearchResult[] = json.data.map((manga: any) => {
		const cover = extractRelationship(manga, 'cover_art');
		const coverFilename = cover?.attributes?.fileName || null;

		return {
			id: manga.id,
			title: extractTitle(manga.attributes),
			altTitles: (manga.attributes.altTitles || [])
				.map((t: any) => Object.values(t)[0])
				.filter(Boolean)
				.slice(0, 3),
			description: manga.attributes.description?.en || '',
			coverUrl: buildCoverUrl(manga.id, coverFilename),
			status: manga.attributes.status || 'unknown',
			year: manga.attributes.year,
			tags: manga.attributes.tags?.map((t: any) => t.attributes?.name?.en).filter(Boolean) || [],
			contentRating: manga.attributes.contentRating || 'safe',
		};
	});

	return { results, total: json.total };
}

export async function getMangaDetail(id: string): Promise<MangaDetail> {
	const [mangaRes, feedRes] = await Promise.all([
		fetch(`${BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`),
		fetch(`${BASE}/manga/${id}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=500&includes[]=scanlation_group`),
	]);

	if (!mangaRes.ok) throw new Error(`MangaDex manga fetch failed: ${mangaRes.status}`);
	if (!feedRes.ok) throw new Error(`MangaDex feed fetch failed: ${feedRes.status}`);

	const [mangaJson, feedJson] = await Promise.all([mangaRes.json(), feedRes.json()]);
	const manga = mangaJson.data;
	const cover = extractRelationship(manga, 'cover_art');
	const authorRel = extractRelationship(manga, 'author');
	const artistRel = extractRelationship(manga, 'artist');

	const chapters: ChapterInfo[] = feedJson.data.map((ch: any) => {
		const group = extractRelationship(ch, 'scanlation_group');
		return {
			id: ch.id,
			chapter: ch.attributes.chapter,
			title: ch.attributes.title,
			volume: ch.attributes.volume,
			pages: ch.attributes.pages || 0,
			publishAt: ch.attributes.publishAt,
			scanlationGroup: group?.attributes?.name || null,
		};
	});

	// Filter out chapters with no hosted pages (external-only) and deduplicate
	const seen = new Set<string>();
	const dedupedChapters = chapters.filter((ch) => {
		if (ch.pages === 0) return false;
		const key = ch.chapter ?? ch.id;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return {
		id: manga.id,
		title: extractTitle(manga.attributes),
		altTitles: (manga.attributes.altTitles || [])
			.map((t: any) => Object.values(t)[0])
			.filter(Boolean)
			.slice(0, 3),
		description: manga.attributes.description?.en || '',
		coverUrl: buildCoverUrl(manga.id, cover?.attributes?.fileName, '512'),
		status: manga.attributes.status || 'unknown',
		year: manga.attributes.year,
		tags: manga.attributes.tags?.map((t: any) => t.attributes?.name?.en).filter(Boolean) || [],
		contentRating: manga.attributes.contentRating || 'safe',
		author: authorRel?.attributes?.name || null,
		artist: artistRel?.attributes?.name || null,
		chapters: dedupedChapters,
	};
}

export async function getChapterPages(chapterId: string): Promise<PageData> {
	const res = await fetch(`${BASE}/at-home/server/${chapterId}`);
	if (!res.ok) throw new Error(`MangaDex chapter pages failed: ${res.status}`);
	const json = await res.json();

	return {
		baseUrl: json.baseUrl,
		hash: json.chapter.hash,
		pages: json.chapter.data,
		pagesSaver: json.chapter.dataSaver,
	};
}
