// eslint-disable-next-line no-restricted-imports
import { basename, dirname } from 'path';
import { Uri } from 'vscode';
import { isLinux, isWindows } from '@env/platform';

// eslint-disable-next-line no-restricted-imports
export { basename, dirname, extname, join as joinPaths } from 'path';

const slash = 47; //slash;

const driveLetterNormalizeRegex = /(?<=^\/?)([A-Z])(?=:\/)/;
const hasSchemeRegex = /^([a-zA-Z][\w+.-]+):/;
const pathNormalizeRegex = /\\/g;

export function commonBase(s1: string, s2: string, delimiter: string, ignoreCase?: boolean): string | undefined {
	const index = commonBaseIndex(s1, s2, delimiter, ignoreCase);
	return index > 0 ? s1.substring(0, index + 1) : undefined;
}

export function commonBaseIndex(s1: string, s2: string, delimiter: string, ignoreCase?: boolean): number {
	if (s1.length === 0 || s2.length === 0) return 0;

	if (ignoreCase ?? !isLinux) {
		s1 = s1.toLowerCase();
		s2 = s2.toLowerCase();
	}

	let char;
	let index = 0;
	for (let i = 0; i < s1.length; i++) {
		char = s1[i];
		if (char !== s2[i]) break;

		if (char === delimiter) {
			index = i;
		}
	}

	return index;
}

export function getBestPath(uri: Uri): string;
export function getBestPath(pathOrUri: string | Uri): string;
export function getBestPath(pathOrUri: string | Uri): string {
	if (typeof pathOrUri === 'string') {
		if (!hasSchemeRegex.test(pathOrUri)) return normalizePath(pathOrUri);

		pathOrUri = Uri.parse(pathOrUri, true);
	}

	return normalizePath(pathOrUri.scheme === 'file' ? pathOrUri.fsPath : pathOrUri.path);
}

export function normalizePath(path: string): string {
	if (!path) return path;

	path = path.replace(pathNormalizeRegex, '/');
	if (path.charCodeAt(path.length - 1) === slash) {
		// Don't remove the trailing slash on Windows root folders, such as z:\
		if (!isWindows || path.length !== 3 || path[1] !== ':') {
			path = path.slice(0, -1);
		}
	}

	if (isWindows) {
		// Ensure that drive casing is normalized (lower case)
		path = path.replace(driveLetterNormalizeRegex, d => d.toLowerCase());
	}

	return path;
}

export function relativeDir(relativePath: string, relativeTo?: string): string {
	const dirPath = dirname(relativePath);
	if (!dirPath || dirPath === '.' || dirPath === relativeTo) return '';
	if (!relativeTo) return dirPath;

	const [relativeDirPath] = splitPath(dirPath, relativeTo);
	return relativeDirPath;
}

export function splitPath(
	pathOrUri: string | Uri,
	root: string | undefined,
	splitOnBaseIfMissing: boolean = false,
	ignoreCase?: boolean,
): [string, string] {
	pathOrUri = getBestPath(pathOrUri);

	if (root) {
		let repoUri;
		if (hasSchemeRegex.test(root)) {
			repoUri = Uri.parse(root, true);
			root = getBestPath(repoUri);
		} else {
			root = normalizePath(root);
		}

		const index = commonBaseIndex(`${root}/`, `${pathOrUri}/`, '/', ignoreCase);
		if (index > 0) {
			root = pathOrUri.substring(0, index);
			pathOrUri = pathOrUri.substring(index + 1);
		} else if (pathOrUri.charCodeAt(0) === slash) {
			pathOrUri = pathOrUri.slice(1);
		}

		if (repoUri != null) {
			root = repoUri.with({ path: root }).toString();
		}
	} else {
		root = normalizePath(splitOnBaseIfMissing ? dirname(pathOrUri) : '');
		pathOrUri = splitOnBaseIfMissing ? basename(pathOrUri) : pathOrUri;
	}

	return [pathOrUri, root];
}
