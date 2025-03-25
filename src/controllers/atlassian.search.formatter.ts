import { SearchResult } from '../services/vendor.atlassian.search.types.js';
import {
	formatPagination,
	formatHeading,
	formatBulletList,
	formatSeparator,
	formatNumberedList,
} from '../utils/formatters/common.formatter.js';

/**
 * Format search results for display
 * @param searchData - Raw search results from the API
 * @param nextCursor - Pagination cursor for retrieving the next set of results
 * @returns Formatted string with search results in markdown format
 */
export function formatSearchResults(
	searchData: SearchResult[],
	nextCursor?: string,
): string {
	if (searchData.length === 0) {
		return 'No Confluence content found matching your query.';
	}

	const lines: string[] = [formatHeading('Confluence Search Results', 1), ''];

	// Use the numbered list formatter for consistent formatting
	const formattedList = formatNumberedList(searchData, (result) => {
		const itemLines: string[] = [];
		const content = result.content;

		// Basic information
		itemLines.push(formatHeading(content.title, 2));

		// Create an object with all the properties to display
		const properties: Record<string, unknown> = {
			ID: content.id,
			Type: content.type,
			Status: content.status,
			Space: result.resultGlobalContainer?.title,
			URL: result.url
				? {
						url: result.url,
						title: 'View in Confluence',
					}
				: undefined,
			Excerpt: result.excerpt
				? result.excerpt.replace(/\n/g, ' ')
				: undefined,
		};

		// Format as a bullet list with proper formatting for each value type
		itemLines.push(formatBulletList(properties, (key) => key));

		return itemLines.join('\n');
	});

	lines.push(formattedList);

	// Add pagination information
	if (nextCursor) {
		lines.push('');
		lines.push(formatSeparator());
		lines.push('');
		lines.push(formatPagination(searchData.length, true, nextCursor));
	}

	return lines.join('\n');
}

/**
 * Process CQL query to handle reserved keywords
 * @param cql - Original CQL query
 * @returns Processed CQL query with reserved keywords properly quoted
 */
export function processCqlQuery(cql: string): string {
	// List of CQL reserved keywords that might be used as space keys
	const reservedKeywords = [
		'AND',
		'OR',
		'NOT',
		'IN',
		'LIKE',
		'IS',
		'NULL',
		'EMPTY',
		'ORDER',
		'BY',
		'ASC',
		'DESC',
	];

	// Process the CQL query in multiple steps
	let processedCql = cql;

	// Step 1: Check for space=KEYWORD pattern and quote the keyword if it's reserved
	processedCql = processedCql.replace(
		/space\s*=\s*(\w+)(?!\s*")/g,
		(match, spaceKey) => {
			if (reservedKeywords.includes(spaceKey.toUpperCase())) {
				return `space="${spaceKey}"`;
			}
			return match;
		},
	);

	// Step 2: Check for other property=KEYWORD patterns with reserved keywords
	processedCql = processedCql.replace(
		/(\w+)\s*=\s*(\w+)(?!\s*")/g,
		(match, property, value) => {
			if (reservedKeywords.includes(value.toUpperCase())) {
				return `${property}="${value}"`;
			}
			return match;
		},
	);

	// Step 3: Handle space-separated search terms by converting to AND syntax if needed
	if (
		!processedCql.includes(' AND ') &&
		!processedCql.includes(' OR ') &&
		!processedCql.includes(' NOT ') &&
		processedCql.includes(' ')
	) {
		// Simple space-separated query without logical operators
		// Split by spaces and reconstruct with AND
		const terms = processedCql.split(' ').filter((term) => term.trim());
		if (terms.length > 1) {
			// Only apply the conversion if there are multiple terms and not already in a complex query
			const hasComplexSyntax = /[=~()]/.test(processedCql);
			if (!hasComplexSyntax) {
				processedCql = terms
					.map((term) => `text~"${term}"`)
					.join(' AND ');
			}
		}
	}

	return processedCql;
}
