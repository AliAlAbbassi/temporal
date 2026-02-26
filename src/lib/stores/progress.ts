import { browser } from '$app/environment';

export interface ReadingProgress {
	mangaId: string;
	chapterId: string;
	chapterNumber: string | null;
	page: number;
	totalPages: number;
	timestamp: number;
	mangaTitle: string;
	coverUrl: string;
}

const STORAGE_KEY = 'manga_progress';
const LIBRARY_KEY = 'manga_library';

function getStorage<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : fallback;
	} catch {
		return fallback;
	}
}

function setStorage(key: string, value: unknown) {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Storage full or unavailable
	}
}

// Reading progress per manga
export function getProgress(mangaId: string): ReadingProgress | null {
	const all = getStorage<Record<string, ReadingProgress>>(STORAGE_KEY, {});
	return all[mangaId] || null;
}

export function getAllProgress(): ReadingProgress[] {
	const all = getStorage<Record<string, ReadingProgress>>(STORAGE_KEY, {});
	return Object.values(all).sort((a, b) => b.timestamp - a.timestamp);
}

export function saveProgress(progress: ReadingProgress) {
	const all = getStorage<Record<string, ReadingProgress>>(STORAGE_KEY, {});
	all[progress.mangaId] = { ...progress, timestamp: Date.now() };
	setStorage(STORAGE_KEY, all);
}

// Read chapters tracking
const READ_KEY = 'manga_read_chapters';

export function getReadChapters(mangaId: string): Set<string> {
	const all = getStorage<Record<string, string[]>>(READ_KEY, {});
	return new Set(all[mangaId] || []);
}

export function markChapterRead(mangaId: string, chapterId: string) {
	const all = getStorage<Record<string, string[]>>(READ_KEY, {});
	const chapters = new Set(all[mangaId] || []);
	chapters.add(chapterId);
	all[mangaId] = [...chapters];
	setStorage(READ_KEY, all);
}

// Library
export interface LibraryEntry {
	mangaId: string;
	title: string;
	coverUrl: string;
	addedAt: number;
}

export function getLibrary(): LibraryEntry[] {
	return getStorage<LibraryEntry[]>(LIBRARY_KEY, []);
}

export function addToLibrary(entry: Omit<LibraryEntry, 'addedAt'>) {
	const lib = getLibrary();
	if (lib.some((e) => e.mangaId === entry.mangaId)) return;
	lib.push({ ...entry, addedAt: Date.now() });
	setStorage(LIBRARY_KEY, lib);
}

export function removeFromLibrary(mangaId: string) {
	const lib = getLibrary().filter((e) => e.mangaId !== mangaId);
	setStorage(LIBRARY_KEY, lib);
}

export function isInLibrary(mangaId: string): boolean {
	return getLibrary().some((e) => e.mangaId === mangaId);
}

// Reading mode preference (per manga, with global default)
export type ReadingMode = 'paged' | 'scroll';

const MODE_KEY = 'manga_reading_mode';

export function getReadingMode(mangaId?: string): ReadingMode {
	const all = getStorage<Record<string, ReadingMode>>(MODE_KEY, {});
	if (mangaId && all[mangaId]) return all[mangaId];
	return all['_default'] || 'paged';
}

export function setReadingMode(mode: ReadingMode, mangaId?: string) {
	const all = getStorage<Record<string, ReadingMode>>(MODE_KEY, {});
	if (mangaId) {
		all[mangaId] = mode;
	}
	all['_default'] = mode;
	setStorage(MODE_KEY, all);
}
