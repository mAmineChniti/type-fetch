import {
  type CacheEntry,
  type ContentType,
  type ContentWrapper,
  DEFAULT_MAX_CACHED_ENTRIES,
  DEFAULT_RETRY_COUNT,
  DEFAULT_RETRY_DELAY,
  type Result,
  type TFetchClientOptions,
  TFetchError,
  Time,
  type UrlOrString,
} from "./types";

/**
 * TFetchClient class provides a wrapper around the Fetch API with features
 * such as retry logic, request caching, and configurable content types.
 *
 * @param opts Configuration options for the client.
 *
 * @returns An instance of TFetchClient.
 */
class TFetchClient {
  public readonly config: TFetchClientOptions;
  private cache: Map<string, CacheEntry<unknown>>;

  /**
   * Creates an instance of TFetchClient with optional configuration.
   * @param opts Configuration options for the client.
   */
  public constructor(opts?: Partial<TFetchClientOptions>) {
    this.config = {
      debug: opts?.debug ?? false,
      headers: opts?.headers ?? {},
      retry: {
        count: opts?.retry?.count ?? DEFAULT_RETRY_COUNT,
        delay: opts?.retry?.delay ?? DEFAULT_RETRY_DELAY,
        onRetry: opts?.retry?.onRetry,
      },
      cache: {
        enabled: opts?.cache?.enabled ?? false,
        maxAge: opts?.cache?.maxAge ?? Time.Minute * 5,
        maxCachedEntries:
          opts?.cache?.maxCachedEntries ?? DEFAULT_MAX_CACHED_ENTRIES,
      },
    };
    this.cache = new Map();
    this.debug("TFetch Client initialized");
  }

  /**
   * Performs a GET request to the specified URL with optional headers.
   * Caches the response if caching is enabled and returns the cached response on subsequent requests.
   * @template T The expected type of the response data.
   * @param url The URL or string representing the endpoint.
   * @param headers Optional headers to include in the request.
   * @returns A promise resolving to the result of the GET request.
   */
  public async get<T>(
    url: UrlOrString,
    headers?: HeadersInit
  ): Promise<Result<T>> {
    const mergedHeaders = this.mergeHeaders(
      this.config.headers ?? {},
      headers ?? {}
    );
    const ckey = this.generateCacheKey(url, mergedHeaders);
    if (this.config.cache?.enabled) {
      const cached = this.getFromCache<T>(ckey);
      if (cached) {
        this.debug(`Cached response found for ${url}`);
        return { data: cached, error: null };
      }
    }
    const result = await this.handleRequest<T>(() =>
      fetch(url.toString(), { method: "GET", headers: mergedHeaders })
    );
    if (this.config.cache?.enabled && result.data)
      this.saveToCache(ckey, result.data);
    return result;
  }

  /**
   * Performs a POST request to the specified URL with the provided body content.
   * @template T The expected type of the response data.
   * @param url The URL or string representing the endpoint.
   * @param headers Optional headers to include in the request.
   * @param body The content wrapper containing the type and data to be sent.
   * @returns A promise resolving to the result of the POST request.
   */
  public async post<T>(
    url: UrlOrString,
    headers: HeadersInit,
    body: ContentWrapper<unknown>
  ): Promise<Result<T>>;
  public async post<T>(
    url: UrlOrString,
    body: ContentWrapper<unknown>
  ): Promise<Result<T>>;
  public async post<T>(
    url: UrlOrString,
    headersOrBody: HeadersInit | ContentWrapper<unknown>,
    body?: ContentWrapper<unknown>
  ): Promise<Result<T>> {
    const [headers, actualBody] = body
      ? [headersOrBody as HeadersInit, body]
      : [{}, headersOrBody as ContentWrapper<unknown>];
    const mergedHeaders = this.mergeHeaders(
      this.config.headers,
      this.getHeaders(actualBody.type),
      headers
    );
    const serialized = this.serializeBody(actualBody);
    return this.handleRequest<T>(() =>
      fetch(url.toString(), {
        method: "POST",
        headers: mergedHeaders,
        body: serialized,
      })
    );
  }

  /**
   * Performs a PUT request to the specified URL with the provided body content.
   * @template T The expected type of the response data.
   * @param url The URL or string representing the endpoint.
   * @param headers Optional headers to include in the request.
   * @param body The content wrapper containing the type and data to be sent.
   * @returns A promise resolving to the result of the PUT request.
   */
  public async put<T>(
    url: UrlOrString,
    headers: HeadersInit,
    body: ContentWrapper<unknown>
  ): Promise<Result<T>>;
  public async put<T>(
    url: UrlOrString,
    body: ContentWrapper<unknown>
  ): Promise<Result<T>>;
  public async put<T>(
    url: UrlOrString,
    headersOrBody: HeadersInit | ContentWrapper<unknown>,
    body?: ContentWrapper<unknown>
  ): Promise<Result<T>> {
    const [headers, actualBody] = body
      ? [headersOrBody as HeadersInit, body]
      : [{}, headersOrBody as ContentWrapper<unknown>];
    const mergedHeaders = this.mergeHeaders(
      this.config.headers,
      this.getHeaders(actualBody.type),
      headers
    );
    const serialized = this.serializeBody(actualBody);
    return this.handleRequest<T>(() =>
      fetch(url.toString(), {
        method: "PUT",
        headers: mergedHeaders,
        body: serialized,
      })
    );
  }

  /**
   * Performs a DELETE request to the specified URL with optional headers.
   * @template T The expected type of the response data.
   * @param url The URL or string representing the endpoint.
   * @param headers Optional headers to include in the request.
   * @returns A promise resolving to the result of the DELETE request.
   */
  public async delete<T>(
    url: UrlOrString,
    headers?: HeadersInit
  ): Promise<Result<T>> {
    const mergedHeaders = this.mergeHeaders(this.config.headers, headers ?? {});
    return this.handleRequest<T>(() =>
      fetch(url.toString(), { method: "DELETE", headers: mergedHeaders })
    );
  }

  /**
   * Handles the execution of a request with retry logic.
   * @template T The expected type of the response data.
   * @param request A function that returns a promise resolving to a Response object.
   * @returns A promise resolving to the result of the request.
   */
  private async handleRequest<T>(
    request: () => Promise<Response>
  ): Promise<Result<T>> {
    let attempts = 0;
    const maxRetries = this.config.retry.count ?? DEFAULT_RETRY_COUNT;
    const delay = this.config.retry.delay ?? DEFAULT_RETRY_DELAY;
    let lastError: Error | null = null;

    while (attempts <= maxRetries) {
      try {
        const res = await request();
        if (!res.ok) {
          const errorText = await res.text();
          return {
            data: null,
            error: new TFetchError(errorText, res.status),
          };
        }
        return { data: (await res.json()) as T, error: null };
      } catch (error) {
        lastError = error as Error;
        if (attempts++ < maxRetries) {
          this.config.retry.onRetry?.();
          await new Promise((r) => setTimeout(r, delay));
        } else {
          return {
            data: null,
            error: new TFetchError(
              lastError.message || "Request failed after max retries",
              lastError instanceof TFetchError
                ? lastError.statusCode
                : undefined
            ),
          };
        }
      }
    }
    return {
      data: null,
      error: new TFetchError("Max retries exceeded"),
    };
  }

  /**
   * Merges multiple header sources into a single Headers object.
   * @param sources Header sources to merge.
   * @returns Merged Headers object.
   */
  private mergeHeaders(...sources: (HeadersInit | undefined)[]): Headers {
    const headers = new Headers();
    for (const src of sources) {
      if (!src) continue;
      new Headers(src).forEach((v, k) => headers.set(k, v));
    }
    return headers;
  }

  /**
   * Generates a cache key based on the URL and headers.
   * @param url The URL or string representing the endpoint.
   * @param headers Headers used in the request.
   * @returns A string representing the cache key.
   */
  private generateCacheKey(url: UrlOrString, headers?: HeadersInit): string {
    return `${url}|${JSON.stringify([...new Headers(headers).entries()])}`;
  }

  /**
   * Saves the response data to the cache with the specified key.
   * @template T The type of the data being cached.
   * @param key The cache key under which the data will be stored.
   * @param data The data to be cached.
   */
  private saveToCache<T>(key: string, data: T): void {
    this.cleanupCache();
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Retrieves data from the cache using the specified key.
   * @template T The expected type of the cached data.
   * @param key The cache key to look up.
   * @returns The cached data if found and not expired, or null if not found.
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > (this.config.cache?.maxAge ?? 0)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  /**
   * Removes the oldest entries from the cache if the maxCachedEntries limit has been reached.
   */
  private cleanupCache(): void {
    if (this.cache.size >= (this.config.cache?.maxCachedEntries ?? 0)) {
      const entriesToDelete = [...this.cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, Math.floor(this.cache.size * 0.25));

      for (const [key] of entriesToDelete) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Returns appropriate headers for the specified content type.
   * @param contentType The content type for which headers are needed.
   * @returns An object representing the headers.
   */
  private getHeaders(type: ContentType): HeadersInit {
    return {
      json: { "Content-Type": "application/json" },
      form: { "Content-Type": "application/x-www-form-urlencoded" },
      text: { "Content-Type": "text/plain" },
      blob: { "Content-Type": "application/octet-stream" },
    }[type];
  }

  /**
   * Serializes the body content based on its type.
   * @param body The content wrapper containing the type and data to be serialized.
   * @returns The serialized body content as a string or Blob.
   * @throws {TFetchError} If the data is invalid for the specified content type.
   */
  private serializeBody(body: ContentWrapper<unknown>): string | Blob {
    const { type, data } = body;

    // Validate data is not null/undefined
    if (data === null || data === undefined) {
      throw new TFetchError(
        `Cannot serialize ${type} data: data is null or undefined`
      );
    }

    // Type-specific validation and serialization
    switch (type) {
      case "json": {
        try {
          return JSON.stringify(data);
        } catch (error) {
          throw new TFetchError(
            `Failed to serialize JSON data: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      case "form": {
        if (typeof data !== "object" || data === null) {
          throw new TFetchError(
            "Form data must be an object with string values"
          );
        }

        try {
          const entries = Object.entries(data).map(([key, value]) => {
            if (typeof value !== "string") {
              throw new TFetchError(
                `Form data values must be strings, got ${typeof value} for key "${key}"`
              );
            }
            return [key, value];
          });
          return new URLSearchParams(entries).toString();
        } catch (error) {
          throw new TFetchError(
            `Failed to serialize form data: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      case "text": {
        try {
          return String(data);
        } catch (error) {
          throw new TFetchError(
            `Failed to serialize text data: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      case "blob": {
        if (data instanceof Blob) {
          return data;
        }
        throw new TFetchError("Blob data must be an instance of Blob");
      }

      default: {
        throw new TFetchError(`Unsupported content type: ${type}`);
      }
    }
  }

  /**
   * Logs a debug message if debug mode is enabled.
   * @param message The message to log.
   */
  private debug(message: string): void {
    if (this.config.debug) console.log(`[DEBUG] ${message}`);
  }
}

export { TFetchClient };
export type { TFetchClientOptions };
