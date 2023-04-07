import { isWindows } from '@env/platform';

// eslint-disable-next-line no-restricted-imports
export { basename, dirname, extname, join as joinPaths } from 'path';

const slash = 47; //slash;

const driveLetterNormalizeRegex = /(?<=^\/?)([A-Z])(?=:\/)/;
const pathNormalizeRegex = /\\/g;

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
