import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	SearchParams,
	SearchResponse,
} from './vendor.atlassian.search.types.js';

const API_PATH = '/rest/api/search';

/**
 * Search Confluence content using CQL
 * @param params Search parameters
 * @returns Search results
 */
async function search(params: SearchParams): Promise<SearchResponse> {
	const logPrefix =
		'[src/services/vendor.atlassian.search.service.ts@search]';
	logger.debug(`${logPrefix} Searching Confluence with params:`, params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	const queryParams = new URLSearchParams({ cql: params.cql });

	if (params.cqlcontext) queryParams.set('cqlcontext', params.cqlcontext);
	if (params.cursor) queryParams.set('cursor', params.cursor);
	if (params.limit !== undefined)
		queryParams.set('limit', params.limit.toString());
	if (params.start !== undefined)
		queryParams.set('start', params.start.toString());
	if (params.includeArchivedSpaces !== undefined)
		queryParams.set(
			'includeArchivedSpaces',
			params.includeArchivedSpaces.toString(),
		);
	if (params.excludeCurrentSpaces !== undefined)
		queryParams.set(
			'excludeCurrentSpaces',
			params.excludeCurrentSpaces.toString(),
		);
	if (params.excerpt) queryParams.set('excerpt', params.excerpt);

	const path = `${API_PATH}?${queryParams.toString()}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<SearchResponse>(credentials, path);
}

export default { search };
