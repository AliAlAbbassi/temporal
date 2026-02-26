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
	externalUrl: string | null;
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

async function fetchAllChapters(mangaId: string): Promise<any[]> {
	const limit = 500;
	let offset = 0;
	let allData: any[] = [];

	// First request
	const firstRes = await fetch(
		`${BASE}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=0&includes[]=scanlation_group`
	);
	if (!firstRes.ok) throw new Error(`MangaDex feed failed: ${firstRes.status}`);
	const firstJson = await firstRes.json();
	allData = firstJson.data;
	const total = firstJson.total;

	// Fetch remaining pages in parallel if needed
	if (total > limit) {
		const remaining: Promise<Response>[] = [];
		for (offset = limit; offset < total && offset < 10000; offset += limit) {
			remaining.push(
				fetch(
					`${BASE}/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=${limit}&offset=${offset}&includes[]=scanlation_group`
				)
			);
		}
		const responses = await Promise.all(remaining);
		const jsons = await Promise.all(responses.map((r) => r.json()));
		for (const json of jsons) {
			allData = allData.concat(json.data);
		}
	}

	return allData;
}

export async function getMangaDetail(id: string): Promise<MangaDetail> {
	const [mangaRes, feedData] = await Promise.all([
		fetch(`${BASE}/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`),
		fetchAllChapters(id),
	]);

	if (!mangaRes.ok) throw new Error(`MangaDex manga fetch failed: ${mangaRes.status}`);

	const mangaJson = await mangaRes.json();
	const manga = mangaJson.data;
	const cover = extractRelationship(manga, 'cover_art');
	const authorRel = extractRelationship(manga, 'author');
	const artistRel = extractRelationship(manga, 'artist');

	const chapters: ChapterInfo[] = feedData.map((ch: any) => {
		const group = extractRelationship(ch, 'scanlation_group');
		return {
			id: ch.id,
			chapter: ch.attributes.chapter,
			title: ch.attributes.title,
			volume: ch.attributes.volume,
			pages: ch.attributes.pages || 0,
			publishAt: ch.attributes.publishAt,
			scanlationGroup: group?.attributes?.name || null,
			externalUrl: ch.attributes.externalUrl || null,
		};
	});

	// Deduplicate: prefer chapters with hosted pages over external-only
	const seen = new Map<string, ChapterInfo>();
	for (const ch of chapters) {
		const key = ch.chapter ?? ch.id;
		const existing = seen.get(key);
		if (!existing || (existing.pages === 0 && ch.pages > 0)) {
			seen.set(key, ch);
		}
	}

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
		chapters: [...seen.values()],
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
