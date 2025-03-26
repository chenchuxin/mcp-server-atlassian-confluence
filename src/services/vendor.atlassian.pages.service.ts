import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	PageDetailed,
	PagesResponse,
	ListPagesParams,
	GetPageByIdParams,
} from './vendor.atlassian.pages.types.js';

/**
 * Base API path for Confluence REST API v2
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
 * @constant {string}
 */
const API_PATH = '/api/v2';

/**
 * @namespace VendorAtlassianPagesService
 * @description Service for interacting with Confluence Pages API.
 * Provides methods for listing pages and retrieving page details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List Confluence pages with optional filtering and pagination
 *
 * Retrieves a list of pages from Confluence with support for various filters
 * and pagination options. Pages can be filtered by space, status, parent, etc.
 *
 * @async
 * @memberof VendorAtlassianPagesService
 * @param {ListPagesParams} [params={}] - Optional parameters for customizing the request
 * @param {string[]} [params.id] - Filter by page IDs
 * @param {string[]} [params.spaceId] - Filter by space IDs
 * @param {string} [params.parentId] - Filter by parent page ID
 * @param {string} [params.sort] - Sort order for results
 * @param {string[]} [params.status] - Filter by page status
 * @param {string} [params.title] - Filter by page title
 * @param {string} [params.bodyFormat] - Format for page body content
 * @param {string} [params.cursor] - Pagination cursor
 * @param {number} [params.limit] - Maximum number of results to return
 * @returns {Promise<PagesResponse>} Promise containing the pages response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // List pages from a specific space
 * const response = await list({
 *   spaceId: ['123'],
 *   status: ['current'],
 *   limit: 25
 * });
 */
async function list(params: ListPagesParams = {}): Promise<PagesResponse> {
	const logPrefix = '[src/services/vendor.atlassian.pages.service.ts@list]';
	logger.debug(`${logPrefix} Listing Confluence pages with params:`, params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Page identifiers
	if (params.id?.length) {
		queryParams.set('id', params.id.join(','));
	}
	if (params.spaceId?.length) {
		queryParams.set('space-id', params.spaceId.join(','));
	}
	if (params.parentId) {
		queryParams.set('parent-id', params.parentId);
	}

	// Filtering and sorting
	if (params.sort) {
		queryParams.set('sort', params.sort);
	}
	if (params.status?.length) {
		queryParams.set('status', params.status.join(','));
	}
	if (params.title) {
		queryParams.set('title', params.title);
	}

	// Content format
	if (params.bodyFormat) {
		queryParams.set('body-format', params.bodyFormat);
	}

	// Pagination
	if (params.cursor) {
		queryParams.set('cursor', params.cursor);
	}
	if (params.limit) {
		queryParams.set('limit', params.limit.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/pages${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<PagesResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Confluence page
 *
 * Retrieves comprehensive details about a single page, including content,
 * metadata, and optional components like labels, properties, and versions.
 *
 * @async
 * @memberof VendorAtlassianPagesService
 * @param {string} id - The ID of the page to retrieve
 * @param {GetPageByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string} [params.bodyFormat] - Format for page body content
 * @param {boolean} [params.getDraft] - Whether to retrieve draft version
 * @param {string[]} [params.status] - Filter by page status
 * @param {number} [params.version] - Specific version to retrieve
 * @param {boolean} [params.includeLabels] - Include page labels
 * @param {boolean} [params.includeProperties] - Include page properties
 * @param {boolean} [params.includeOperations] - Include available operations
 * @param {boolean} [params.includeLikes] - Include like information
 * @param {boolean} [params.includeVersions] - Include version history
 * @param {boolean} [params.includeVersion] - Include version details
 * @param {boolean} [params.includeFavoritedByCurrentUserStatus] - Include favorite status
 * @param {boolean} [params.includeWebresources] - Include web resources
 * @param {boolean} [params.includeCollaborators] - Include collaborator information
 * @returns {Promise<PageDetailed>} Promise containing the detailed page information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get page details with labels and versions
 * const page = await get('123', {
 *   bodyFormat: 'storage',
 *   includeLabels: true,
 *   includeVersions: true
 * });
 */
async function get(
	id: string,
	params: GetPageByIdParams = {},
): Promise<PageDetailed> {
	const logPrefix = '[src/services/vendor.atlassian.pages.service.ts@get]';
	logger.debug(`${logPrefix} Getting Confluence page with ID: ${id}`);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Content format
	if (params.bodyFormat) {
		queryParams.set('body-format', params.bodyFormat);
	}
	if (params.getDraft !== undefined) {
		queryParams.set('get-draft', params.getDraft.toString());
	}
	if (params.status?.length) {
		queryParams.set('status', params.status.join(','));
	}
	if (params.version !== undefined) {
		queryParams.set('version', params.version.toString());
	}

	// Include flags
	if (params.includeLabels !== undefined) {
		queryParams.set('include-labels', params.includeLabels.toString());
	}
	if (params.includeProperties !== undefined) {
		queryParams.set(
			'include-properties',
			params.includeProperties.toString(),
		);
	}
	if (params.includeOperations !== undefined) {
		queryParams.set(
			'include-operations',
			params.includeOperations.toString(),
		);
	}
	if (params.includeLikes !== undefined) {
		queryParams.set('include-likes', params.includeLikes.toString());
	}
	if (params.includeVersions !== undefined) {
		queryParams.set('include-versions', params.includeVersions.toString());
	}
	if (params.includeVersion !== undefined) {
		queryParams.set('include-version', params.includeVersion.toString());
	}
	if (params.includeFavoritedByCurrentUserStatus !== undefined) {
		queryParams.set(
			'include-favorited-by-current-user-status',
			params.includeFavoritedByCurrentUserStatus.toString(),
		);
	}
	if (params.includeWebresources !== undefined) {
		queryParams.set(
			'include-webresources',
			params.includeWebresources.toString(),
		);
	}
	if (params.includeCollaborators !== undefined) {
		queryParams.set(
			'include-collaborators',
			params.includeCollaborators.toString(),
		);
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/pages/${id}${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<PageDetailed>(credentials, path);
}

export default { list, get };
