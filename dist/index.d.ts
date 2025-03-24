import { type ContentWrapper, type Result, type TFetchClientOptions, type UrlOrString } from "./types";
/**
 * TFetchClient class provides a wrapper around the Fetch API with features
 * such as retry logic, request caching, and configurable content types.
 *
 * @param opts Configuration options for the client.
 *
 * @returns An instance of TFetchClient.
 */
declare class TFetchClient {
    readonly config: TFetchClientOptions;
    private cache;
    /**
     * Creates an instance of TFetchClient with optional configuration.
     * @param opts Configuration options for the client.
     */
    constructor(opts?: Partial<TFetchClientOptions>);
    /**
     * Performs a GET request to the specified URL with optional headers.
     * Caches the response if caching is enabled and returns the cached response on subsequent requests.
     * @template T The expected type of the response data.
     * @param url The URL or string representing the endpoint.
     * @param headers Optional headers to include in the request.
     * @returns A promise resolving to the result of the GET request.
     */
    get<T>(url: UrlOrString, headers?: HeadersInit): Promise<Result<T>>;
    /**
     * Performs a POST request to the specified URL with the provided body content.
     * @template T The expected type of the response data.
     * @param url The URL or string representing the endpoint.
     * @param headers Optional headers to include in the request.
     * @param body The content wrapper containing the type and data to be sent.
     * @returns A promise resolving to the result of the POST request.
     */
    post<T>(url: UrlOrString, headers: HeadersInit, body: ContentWrapper<unknown>): Promise<Result<T>>;
    post<T>(url: UrlOrString, body: ContentWrapper<unknown>): Promise<Result<T>>;
    /**
     * Performs a PUT request to the specified URL with the provided body content.
     * @template T The expected type of the response data.
     * @param url The URL or string representing the endpoint.
     * @param headers Optional headers to include in the request.
     * @param body The content wrapper containing the type and data to be sent.
     * @returns A promise resolving to the result of the PUT request.
     */
    put<T>(url: UrlOrString, headers: HeadersInit, body: ContentWrapper<unknown>): Promise<Result<T>>;
    put<T>(url: UrlOrString, body: ContentWrapper<unknown>): Promise<Result<T>>;
    /**
     * Performs a DELETE request to the specified URL with optional headers.
     * @template T The expected type of the response data.
     * @param url The URL or string representing the endpoint.
     * @param headers Optional headers to include in the request.
     * @returns A promise resolving to the result of the DELETE request.
     */
    delete<T>(url: UrlOrString, headers?: HeadersInit): Promise<Result<T>>;
    /**
     * Handles the execution of a request with retry logic.
     * @template T The expected type of the response data.
     * @param request A function that returns a promise resolving to a Response object.
     * @returns A promise resolving to the result of the request.
     */
    private handleRequest;
    /**
     * Merges multiple header sources into a single Headers object.
     * @param sources Header sources to merge.
     * @returns Merged Headers object.
     */
    private mergeHeaders;
    /**
     * Generates a cache key based on the URL and headers.
     * @param url The URL or string representing the endpoint.
     * @param headers Headers used in the request.
     * @returns A string representing the cache key.
     */
    private generateCacheKey;
    /**
     * Saves the response data to the cache with the specified key.
     * @template T The type of the data being cached.
     * @param key The cache key under which the data will be stored.
     * @param data The data to be cached.
     */
    private saveToCache;
    /**
     * Retrieves data from the cache using the specified key.
     * @template T The expected type of the cached data.
     * @param key The cache key to look up.
     * @returns The cached data if found and not expired, or null if not found.
     */
    private getFromCache;
    /**
     * Removes the oldest entries from the cache if the maxCachedEntries limit has been reached.
     */
    private cleanupCache;
    /**
     * Returns appropriate headers for the specified content type.
     * @param contentType The content type for which headers are needed.
     * @returns An object representing the headers.
     */
    private getHeaders;
    /**
     * Serializes the body content based on its type.
     * @param body The content wrapper containing the type and data to be serialized.
     * @returns The serialized body content as a string or Blob.
     * @throws {TFetchError} If the data is invalid for the specified content type.
     */
    private serializeBody;
    /**
     * Logs a debug message if debug mode is enabled.
     * @param message The message to log.
     */
    private debug;
}
export { TFetchClient };
export type { TFetchClientOptions };
