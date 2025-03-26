import { createAuthMissingError } from '../utils/error.util.js';
import { logger } from '../utils/logger.util.js';
import {
	fetchAtlassian,
	getAtlassianCredentials,
} from '../utils/transport.util.js';
import {
	SpaceDetailed,
	SpacesResponse,
	ListSpacesParams,
	GetSpaceByIdParams,
} from './vendor.atlassian.spaces.types.js';

/**
 * Base API path for Confluence REST API v2
 * @see https://developer.atlassian.com/cloud/confluence/rest/v2/intro/
 * @constant {string}
 */
const API_PATH = '/api/v2';

/**
 * @namespace VendorAtlassianSpacesService
 * @description Service for interacting with Confluence Spaces API.
 * Provides methods for listing spaces and retrieving space details.
 * All methods require valid Atlassian credentials configured in the environment.
 */

/**
 * List Confluence spaces with optional filtering and pagination
 *
 * Retrieves a list of spaces from Confluence with support for various filters
 * and pagination options. Spaces can be filtered by type, status, labels, etc.
 *
 * @async
 * @memberof VendorAtlassianSpacesService
 * @param {ListSpacesParams} [params={}] - Optional parameters for customizing the request
 * @param {string[]} [params.ids] - Filter by space IDs
 * @param {string[]} [params.keys] - Filter by space keys
 * @param {string} [params.type] - Filter by space type
 * @param {string} [params.status] - Filter by space status
 * @param {string[]} [params.labels] - Filter by space labels
 * @param {string} [params.favoritedBy] - Filter by user who favorited
 * @param {string} [params.notFavoritedBy] - Filter by user who hasn't favorited
 * @param {string} [params.sort] - Sort order for results
 * @param {string} [params.descriptionFormat] - Format for space descriptions
 * @param {boolean} [params.includeIcon] - Include space icon
 * @param {string} [params.cursor] - Pagination cursor
 * @param {number} [params.limit] - Maximum number of results to return
 * @returns {Promise<SpacesResponse>} Promise containing the spaces response with results and pagination info
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // List global spaces with icon
 * const response = await list({
 *   type: 'global',
 *   status: 'current',
 *   includeIcon: true,
 *   limit: 25
 * });
 */
async function list(params: ListSpacesParams = {}): Promise<SpacesResponse> {
	const logPrefix = '[src/services/vendor.atlassian.spaces.service.ts@list]';
	logger.debug(`${logPrefix} Listing Confluence spaces with params:`, params);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Space identifiers
	if (params.ids?.length) {
		queryParams.set('ids', params.ids.join(','));
	}
	if (params.keys?.length) {
		queryParams.set('keys', params.keys.join(','));
	}

	// Filtering and sorting
	if (params.type) {
		queryParams.set('type', params.type);
	}
	if (params.status) {
		queryParams.set('status', params.status);
	}
	if (params.labels?.length) {
		queryParams.set('labels', params.labels.join(','));
	}

	// Favorites filtering
	if (params.favoritedBy) {
		queryParams.set('favorited-by', params.favoritedBy);
	}
	if (params.notFavoritedBy) {
		queryParams.set('not-favorited-by', params.notFavoritedBy);
	}

	// Content format and display options
	if (params.sort) {
		queryParams.set('sort', params.sort);
	}
	if (params.descriptionFormat) {
		queryParams.set('description-format', params.descriptionFormat);
	}
	if (params.includeIcon !== undefined) {
		queryParams.set('include-icon', params.includeIcon.toString());
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
	const path = `${API_PATH}/spaces${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<SpacesResponse>(credentials, path);
}

/**
 * Get detailed information about a specific Confluence space
 *
 * Retrieves comprehensive details about a single space, including metadata,
 * description, and optional components like labels, properties, and permissions.
 *
 * @async
 * @memberof VendorAtlassianSpacesService
 * @param {string} id - The ID of the space to retrieve
 * @param {GetSpaceByIdParams} [params={}] - Optional parameters for customizing the response
 * @param {string} [params.descriptionFormat] - Format for space description
 * @param {boolean} [params.includeIcon] - Include space icon
 * @param {boolean} [params.includeOperations] - Include available operations
 * @param {boolean} [params.includeProperties] - Include space properties
 * @param {boolean} [params.includePermissions] - Include permission information
 * @param {boolean} [params.includeRoleAssignments] - Include role assignments
 * @param {boolean} [params.includeLabels] - Include space labels
 * @returns {Promise<SpaceDetailed>} Promise containing the detailed space information
 * @throws {Error} If Atlassian credentials are missing or API request fails
 * @example
 * // Get space details with labels and permissions
 * const space = await get('123', {
 *   descriptionFormat: 'view',
 *   includeLabels: true,
 *   includePermissions: true
 * });
 */
async function get(
	id: string,
	params: GetSpaceByIdParams = {},
): Promise<SpaceDetailed> {
	const logPrefix = '[src/services/vendor.atlassian.spaces.service.ts@get]';
	logger.debug(
		`${logPrefix} Getting Confluence space with ID: ${id}, params:`,
		params,
	);

	const credentials = getAtlassianCredentials();
	if (!credentials) {
		throw createAuthMissingError(
			'Atlassian credentials are required for this operation',
		);
	}

	// Build query parameters
	const queryParams = new URLSearchParams();

	// Content format
	if (params.descriptionFormat) {
		queryParams.set('description-format', params.descriptionFormat);
	}

	// Include flags
	if (params.includeIcon !== undefined) {
		queryParams.set('include-icon', params.includeIcon.toString());
	}
	if (params.includeOperations !== undefined) {
		queryParams.set(
			'include-operations',
			params.includeOperations.toString(),
		);
	}
	if (params.includeProperties !== undefined) {
		queryParams.set(
			'include-properties',
			params.includeProperties.toString(),
		);
	}
	if (params.includePermissions !== undefined) {
		queryParams.set(
			'include-permissions',
			params.includePermissions.toString(),
		);
	}
	if (params.includeRoleAssignments !== undefined) {
		queryParams.set(
			'include-role-assignments',
			params.includeRoleAssignments.toString(),
		);
	}
	if (params.includeLabels !== undefined) {
		queryParams.set('include-labels', params.includeLabels.toString());
	}

	const queryString = queryParams.toString()
		? `?${queryParams.toString()}`
		: '';
	const path = `${API_PATH}/spaces/${id}${queryString}`;

	logger.debug(`${logPrefix} Sending request to: ${path}`);
	return fetchAtlassian<SpaceDetailed>(credentials, path);
}

export default { list, get };
