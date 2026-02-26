import * as mangadex from './mangadex';
import * as mangapill from './mangapill';

export type SourceId = 'mangadex' | 'mangapill';

export interface ParsedId {
	source: SourceId;
	id: string;
}

/** Parse a prefixed ID like "mangapill:2/one-piece" into source + raw id.
 *  Unprefixed IDs default to mangadex. */
export function parseId(prefixedId: string): ParsedId {
	if (prefixedId.startsWith('mangapill:')) {
		return { source: 'mangapill', id: prefixedId.slice('mangapill:'.length) };
	}
	return { source: 'mangadex', id: prefixedId };
}

export async function searchAll(query: string, limit = 20) {
	const [mdxResult, mpResult] = await Promise.allSettled([
		mangadex.searchManga(query, limit),
		mangapill.searchManga(query, limit),
	]);

	const results = [];

	if (mdxResult.status === 'fulfilled') {
		results.push(...mdxResult.value.results);
	}
	if (mpResult.status === 'fulfilled') {
		results.push(...mpResult.value.results);
	}

	return { results, total: results.length };
}

export async function getMangaDetail(prefixedId: string) {
	const { source, id } = parseId(prefixedId);
	if (source === 'mangapill') {
		return mangapill.getMangaDetail(id);
	}
	return mangadex.getMangaDetail(id);
}

export async function getChapterPages(prefixedId: string) {
	const { source, id } = parseId(prefixedId);
	if (source === 'mangapill') {
		return mangapill.getChapterPages(id);
	}
	return mangadex.getChapterPages(id);
}
