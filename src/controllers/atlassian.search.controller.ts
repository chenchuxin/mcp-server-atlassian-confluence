import atlassianSearchService from '../services/vendor.atlassian.search.service.js';
import { logger } from '../utils/logger.util.js';
import { handleControllerError } from '../utils/errorHandler.util.js';
import {
	extractPaginationInfo,
	PaginationType,
} from '../utils/pagination.util.js';
import { SearchOptions, ControllerResponse } from './atlassian.search.type.js';
import {
	formatSearchResults,
	processCqlQuery,
} from './atlassian.search.formatter.js';
import { ExcerptStrategy } from '../services/vendor.atlassian.types.js';

/**
 * Controller for searching Confluence content.
 * Provides functionality for searching content using CQL.
 */

/**
 * Search Confluence content using CQL
 * @param options - Search options including CQL query, cursor, and limit
 * @returns Promise with formatted search results and pagination information
 */
async function search(options: SearchOptions): Promise<ControllerResponse> {
	const source = `[src/controllers/atlassian.search.controller.ts@search]`;
	logger.debug(
		`${source} Searching Confluence with CQL: ${options.cql}`,
		options,
	);

	try {
		if (!options.cql) {
			// Instead of throwing createApiError directly, use handleControllerError
			handleControllerError(
				new Error('CQL query is required for search'),
				{
					entityType: 'Search',
					operation: 'validating',
					source: 'src/controllers/atlassian.search.controller.ts@search',
				},
			);
		}

		// Process the CQL query to handle reserved keywords
		const processedCql = processCqlQuery(options.cql);

		// If the query was modified, log the change
		if (processedCql !== options.cql) {
			logger.debug(
				`${source} Modified CQL query to handle reserved keywords: ${processedCql}`,
			);
		}

		// Set up search parameters
		const searchParams = {
			cql: processedCql,
			cursor: options.cursor,
			limit: options.limit || 25,
			excerpt: 'highlight' as ExcerptStrategy, // Always include highlighted excerpts in search results
		};

		logger.debug(`${source} Using search params:`, searchParams);

		const searchData = await atlassianSearchService.search(searchParams);
		logger.debug(
			`${source} Retrieved ${searchData.results?.length || 0} results`,
		);

		// Extract pagination information using the utility
		const pagination = extractPaginationInfo(
			searchData,
			PaginationType.CURSOR,
			source,
		);

		// Format the search results for display using the formatter
		const formattedResults = formatSearchResults(
			searchData.results,
			pagination.nextCursor,
		);

		return {
			content: formattedResults,
			pagination,
		};
	} catch (error) {
		// Use the standardized error handler
		handleControllerError(error, {
			entityType: 'Search',
			operation: 'searching',
			source: 'src/controllers/atlassian.search.controller.ts@search',
			additionalInfo: { options, cql: options.cql },
		});
	}
}

export default { search };
