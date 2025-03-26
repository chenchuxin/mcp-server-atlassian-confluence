import { logger } from './logger.util.js';
import { config } from './config.util.js';
import {
	createAuthInvalidError,
	createApiError,
	createUnexpectedError,
	McpError,
} from './error.util.js';

/**
 * Interface for Atlassian API credentials
 */
export interface AtlassianCredentials {
	siteName: string;
	userEmail: string;
	apiToken: string;
}

/**
 * Interface for HTTP request options
 */
export interface RequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	headers?: Record<string, string>;
	body?: unknown;
	cookies?: string;
}

/**
 * Get Atlassian credentials from environment variables
 * @returns AtlassianCredentials object or null if credentials are missing
 */
export function getAtlassianCredentials(): AtlassianCredentials | null {
	const siteName = config.get('ATLASSIAN_SITE_NAME');
	const userEmail = config.get('ATLASSIAN_USER_EMAIL');
	const apiToken = config.get('ATLASSIAN_API_TOKEN');

	if (!siteName || !userEmail || !apiToken) {
		logger.warn(
			'Missing Atlassian credentials. Please set ATLASSIAN_SITE_NAME, ATLASSIAN_USER_EMAIL, and ATLASSIAN_API_TOKEN environment variables.',
		);
		return null;
	}

	return {
		siteName,
		userEmail,
		apiToken,
	};
}

/**
 * Fetch data from Atlassian API
 * @param credentials Atlassian API credentials
 * @param path API endpoint path (without base URL)
 * @param options Request options
 * @returns Response data
 */
export async function fetchAtlassian<T>(
	credentials: AtlassianCredentials,
	path: string,
	options: RequestOptions = {},
): Promise<T> {
	const { siteName, userEmail, apiToken } = credentials;

	// Ensure path starts with a slash
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;

	// 只在 siteName 不是 http 开头时才添加 https://
	const baseUrl = siteName.toLowerCase().startsWith('http') ? siteName : `https://${siteName}`;
	const url = `${baseUrl}${normalizedPath}`;

	// Set up authentication and headers
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
		...options.headers,
	};

	// Add cookie from environment variable if provided
	const cookieEnv = config.get('ATLASSIAN_COOKIE');
	if (cookieEnv) {
		headers['Cookie'] = cookieEnv;
	}

	// Add cookie from options if provided (overrides environment variable)
	if (options.cookies) {
		headers['Cookie'] = options.cookies;
	}

	// 只在没有 cookie 时添加 Basic Auth
	if (!headers['Cookie']) {
		headers['Authorization'] = `Basic ${Buffer.from(`${userEmail}:${apiToken}`).toString('base64')}`;
	}

	// Prepare request options
	const requestOptions: RequestInit = {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined,
	};

	// 生成等效的 curl 命令
	const curlCommand = generateCurlCommand(url, requestOptions);
	logger.debug(
		`[src/utils/transport.util.ts@fetchAtlassian] Equivalent curl command:\n${curlCommand}`,
	);

	logger.debug(
		`[src/utils/transport.util.ts@fetchAtlassian] Calling Atlassian API: ${url}`,
	);

	try {
		const response = await fetch(url, requestOptions);

		// Log the raw response status and headers
		logger.debug(
			`[src/utils/transport.util.ts@fetchAtlassian] Raw response received: ${response.status} ${response.statusText}`,
			{
				url,
				status: response.status,
				statusText: response.statusText,
				headers: Object.fromEntries(response.headers.entries()),
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			logger.error(
				`[src/utils/transport.util.ts@fetchAtlassian] API error: ${response.status} ${response.statusText}`,
				errorText,
			);

			// Try to parse the error response
			let errorMessage = `${response.status} ${response.statusText}`;
			let parsedError = null;

			try {
				if (
					errorText &&
					(errorText.startsWith('{') || errorText.startsWith('['))
				) {
					parsedError = JSON.parse(errorText);

					// Extract specific error details from Atlassian API response formats
					if (
						parsedError.errors &&
						Array.isArray(parsedError.errors) &&
						parsedError.errors.length > 0
					) {
						// Format: {"errors":[{"status":400,"code":"INVALID_REQUEST_PARAMETER","title":"..."}]}
						const atlassianError = parsedError.errors[0];
						if (atlassianError.title) {
							errorMessage = atlassianError.title;
						}
					} else if (parsedError.message) {
						// Format: {"message":"Some error message"}
						errorMessage = parsedError.message;
					}
				}
			} catch (parseError) {
				logger.debug(
					`[src/utils/transport.util.ts@fetchAtlassian] Error parsing error response:`,
					parseError,
				);
				// Fall back to the default error message
			}

			// Classify HTTP errors based on status code
			if (response.status === 401 || response.status === 403) {
				throw createAuthInvalidError('Invalid Atlassian credentials');
			} else if (response.status === 404) {
				throw createApiError(`Resource not found`, 404, errorText);
			} else {
				// For other API errors, preserve the original error message from Atlassian API
				throw createApiError(errorMessage, response.status, errorText);
			}
		}

		// Clone the response to log its content without consuming it
		const clonedResponse = response.clone();
		const responseJson = await clonedResponse.json();
		logger.debug(
			`[src/utils/transport.util.ts@fetchAtlassian] Response body:`,
			responseJson,
		);

		return response.json() as Promise<T>;
	} catch (error) {
		logger.error(
			`[src/utils/transport.util.ts@fetchAtlassian] Request failed`,
			error,
		);

		// If it's already an McpError, just rethrow it
		if (error instanceof McpError) {
			throw error;
		}

		// Handle network or parsing errors
		if (error instanceof TypeError || error instanceof SyntaxError) {
			throw createApiError(
				`Network or parsing error: ${error instanceof Error ? error.message : String(error)}`,
				500,
				error,
			);
		}

		throw createUnexpectedError(
			`Unexpected error while calling Atlassian API: ${error instanceof Error ? error.message : String(error)}`,
			error,
		);
	}
}

/**
 * 生成等效的 curl 命令
 * @param url 请求 URL
 * @param options 请求选项
 * @returns curl 命令字符串
 */
function generateCurlCommand(url: string, options: RequestInit): string {
	const parts = ['curl'];

	// 添加 HTTP 方法
	if (options.method && options.method !== 'GET') {
		parts.push(`-X ${options.method}`);
	}
	
	// 添加请求头
	if (options.headers) {
		Object.entries(options.headers).forEach(([key, value]) => {
			parts.push(`-H '${key}: ${value}'`);
		});
	}

	// 添加请求体
	if (options.body) {
		parts.push(`-d '${options.body}'`);
	}

	// 添加 URL
	parts.push(`'${url}'`);

	return parts.join(' ');
}
