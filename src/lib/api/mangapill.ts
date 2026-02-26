const BASE = 'https://mangapill.com';
const CDN_REFERER = 'https://mangapill.com/';
const UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

import type { MangaSearchResult, MangaDetail, ChapterInfo } from './mangadex';

interface MangaPillPageData {
	pages: string[];
}

async function fetchHTML(path: string): Promise<string> {
	const res = await fetch(`${BASE}${path}`, {
		headers: { 'User-Agent': UA },
		redirect: 'follow',
	});
	if (!res.ok) throw new Error(`MangaPill fetch failed: ${res.status}`);
	return res.text();
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&#34;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"');
}

/** Convert "2/one-piece" to "2--one-piece" for URL-safe IDs */
function encodeSlug(path: string): string {
	return path.replace(/\//g, '--');
}

/** Convert "2--one-piece" back to "2/one-piece" */
function decodeSlug(encoded: string): string {
	return encoded.replace(/--/g, '/');
}

export async function searchManga(
	query: string,
	limit = 20,
): Promise<{ results: MangaSearchResult[]; total: number }> {
	const html = await fetchHTML(`/search?q=${encodeURIComponent(query)}`);

	const results: MangaSearchResult[] = [];
	const cardRegex =
		/<a href="(\/manga\/(\d+)\/([^"]+))"[^>]*>\s*<figure[^>]*>\s*<img data-src="([^"]+)" alt="([^"]+)"/g;

	let match;
	while ((match = cardRegex.exec(html)) !== null && results.length < limit) {
		const [, , mangaId, slug, coverUrl, altText] = match;

		// Extract type/year/status from the card
		const cardEnd = html.indexOf('</div>\n', match.index + match[0].length);
		const cardHtml = html.substring(match.index, cardEnd + 200);

		const titleMatch = cardHtml.match(/font-black[^>]*>([^<]+)</);
		const yearMatch = cardHtml.match(/bg-orange-500[^>]*>(\d{4})/);
		const statusMatch = cardHtml.match(/bg-green-500[^>]*>([^<]+)/);
		const typeMatch = cardHtml.match(/bg-purple-500[^>]*>([^<]+)/);

		results.push({
			id: `mangapill:${encodeSlug(`${mangaId}/${slug}`)}`,
			title: decodeEntities(titleMatch?.[1]?.trim() || altText),
			altTitles: [],
			description: '',
			coverUrl: `/api/proxy/mangapill/cover?url=${encodeURIComponent(coverUrl)}`,
			status: statusMatch?.[1]?.trim() || 'unknown',
			year: yearMatch ? parseInt(yearMatch[1]) : null,
			tags: typeMatch ? [typeMatch[1].trim()] : [],
			contentRating: 'safe',
		});
	}

	return { results, total: results.length };
}

export async function getMangaDetail(mangaPillId: string): Promise<MangaDetail> {
	// mangaPillId format: "2--one-piece" (decoded to "2/one-piece")
	const path = decodeSlug(mangaPillId);
	const html = await fetchHTML(`/manga/${path}`);

	// Title
	const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
	const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : 'Unknown';

	// Cover
	const coverMatch = html.match(
		/<img data-src="([^"]+)"[^>]*class="[^"]*object-cover[^"]*"[^>]*\/>/,
	);
	const coverUrl = coverMatch
		? `/api/proxy/mangapill/cover?url=${encodeURIComponent(coverMatch[1])}`
		: '';

	// Status, Year
	const statusMatch = html.match(/Status<\/label>\s*<div>([^<]+)<\/div>/i);
	const yearMatch = html.match(/Year<\/label>\s*<div>(\d{4})<\/div>/i);

	// Genres
	const genres = [...html.matchAll(/\/search\?genre=[^"]+">([^<]+)</g)].map((m) =>
		m[1].trim(),
	);

	// Description - from meta tag
	const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
	const description = descMatch ? decodeEntities(descMatch[1].trim()) : '';

	// Chapters - listed in descending order on the page
	const chapterLinks = [
		...html.matchAll(/href="\/chapters\/(\d+-\d+)\/[^"]*chapter-([^"]+)"/g),
	];

	const chapters: ChapterInfo[] = chapterLinks.map((m) => {
		const [, chapterId, chapterNum] = m;
		return {
			id: `mangapill:${chapterId}`,
			chapter: chapterNum,
			title: null,
			volume: null,
			pages: 1, // MangaPill always has pages
			publishAt: new Date().toISOString(),
			scanlationGroup: 'MangaPill',
			externalUrl: null,
		};
	});

	// Reverse to ascending order (chapter 1 first)
	chapters.reverse();

	return {
		id: `mangapill:${encodeSlug(path)}`,
		title,
		altTitles: [],
		description,
		coverUrl,
		status: statusMatch?.[1]?.trim() || 'unknown',
		year: yearMatch ? parseInt(yearMatch[1]) : null,
		tags: genres,
		contentRating: 'safe',
		author: null,
		artist: null,
		chapters,
	};
}

export async function getChapterPages(chapterId: string): Promise<MangaPillPageData> {
	// chapterId format: "2-10001000"
	const html = await fetchHTML(`/chapters/${chapterId}`);

	// Extract page image URLs
	const pageUrls = [
		...html.matchAll(/https:\/\/cdn\.readdetectiveconan\.com\/file\/mangap\/[^"'\s]+/g),
	].map((m) => m[0]);

	return {
		pages: pageUrls.map(
			(url) => `/api/proxy/mangapill/page?url=${encodeURIComponent(url)}`,
		),
	};
}

export const MANGAPILL_REFERER = CDN_REFERER;
export const MANGAPILL_UA = UA;
