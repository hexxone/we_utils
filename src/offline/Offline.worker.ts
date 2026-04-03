/// <reference lib="webworker" />
/**
 * @author hexxone / https://hexx.one
 *
 * @license
 * Copyright (c) 2026 hexxone All rights reserved.
 * Licensed under the GNU GENERAL PUBLIC LICENSE.
 * See LICENSE file in the project root for full license information.
 *
 * @description
 * Generic Service Worker for Caching an app and making it available offline.
 * Needs to be passed the `?jsonPath=` argument with a path to a file json.
 * Everything else is explained in between...
 *
 * @see
 * Read more: https://ponyfoo.com/articles/progressive-networking-serviceworker
 */
/* eslint-env browser */

'use strict';

const wrk = self as unknown as ServiceWorkerGlobalScope;

// A version number is useful when updating the worker logic,
// allowing you to remove outdated cache entries during the update.
const wName = '[OfflineWorker]';
const version = '__OFFLINE_VERSION__';
const cachePrefix = `${wName}::`;
const cacheName = `${cachePrefix}${version}`;

console.debug(`${wName} executing..`);

type OfflineManifest = string[] | {
    version?: string;
    files?: string[];
};

function parseManifest(data: OfflineManifest): string[] {
    if (Array.isArray(data)) {
        return Array.from(new Set(data));
    }

    if (!Array.isArray(data.files)) {
        throw new Error(`${wName} invalid offline manifest.`);
    }

    if (data.version && data.version !== version) {
        console.warn(
            `${wName} manifest version mismatch.`,
            data.version,
            version
        );
    }

    return Array.from(new Set(data.files));
}

function shouldBypassRuntimeCache(request: Request, manifestPath: string): boolean {
    const { pathname } = new URL(request.url);

    return pathname === manifestPath || pathname.endsWith('/Offline.worker.js');
}

async function storeResponse(
    request: RequestInfo | URL | string,
    response: Response
): Promise<Response> {
    const injected = injectIsolationHeaders(response);

    if (!response.ok) {
        return injected;
    }

    const cache = await caches.open(cacheName);

    await cache.put(request, injected.clone());

    console.debug(`${wName} fetch response stored in cache.`);

    return injected;
}

// The install event fires when the service worker is first installed.
// You can use this event to prepare the service worker to be able to serve
// files while visitors are offline.
wrk.addEventListener('install', (event) => {
    console.debug(`${wName} install event in progress.`);

    // get the path for the .json file which contains the files to-be-cached
    // These resources will be downloaded and cached by the service worker
    // If any resource fails to be downloaded, then the service worker won't be installed.
    const sp = new URL(location.href).searchParams;
    const jsonPath = sp.get('jsonPath') || 'offlinefiles.json';
    const manifestUrl = new URL(jsonPath, wrk.location.href);

    const promise = async () => {
        await wrk.skipWaiting();

        const manifestResponse = await fetch(new Request(manifestUrl.toString(), {
            cache: 'reload'
        }));

        if (!manifestResponse.ok) {
            throw new Error(`${wName} failed to load offline manifest.`);
        }

        const fileList = parseManifest(await manifestResponse.json());
        const cache = await caches.open(cacheName);

        await Promise.all(fileList.map(async (url) => {
            const request = new Request(url, {
                cache: 'reload'
            });
            const response = await fetch(request);

            if (!response.ok) {
                throw new Error(`${wName} failed to precache ${url}.`);
            }

            await cache.put(url, injectIsolationHeaders(response));
        }));
    };

    // Using event.waitUntil(p) blocks the installation process on the provided
    // promise. If the promise is rejected, the service worker won't be installed.
    event.waitUntil(promise());
});

const ISOLATION_HEADERS: Record<string, string> = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'cross-origin'
};

function injectIsolationHeaders(response: Response): Response {
    const headers = new Headers(response.headers);

    for (const [k, v] of Object.entries(ISOLATION_HEADERS)) {
        headers.set(k, v);
    }

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
    });
}

self.addEventListener('fetch', (event: any) => {
    if (event.request.method !== 'GET') {
        console.debug(
            `${wName} fetch event ignored.`,
            event.request.method,
            event.request.url
        );

        return;
    }

    event.respondWith(
        (async () => {
            const sp = new URL(location.href).searchParams;
            const jsonPath = sp.get('jsonPath') || 'offlinefiles.json';
            const manifestPath = new URL(jsonPath, wrk.location.href).pathname;

            if (shouldBypassRuntimeCache(event.request, manifestPath)) {
                return fetch(event.request);
            }

            const cache = await caches.open(cacheName);
            const cached = await cache.match(event.request);

            if (cached) {
                console.debug(`${wName} fetch event(cached): `, event.request.url);

                return (cached); // Already has injected headers from when it was stored
            }

            const preload = await event.preloadResponse;

            if (preload) {
                return storeResponse(event.request, preload);
            }

            function unableToResolve() {
                console.error(
                    `${wName} fetch request failed in both cache and network.`
                );

                return new Response('Service Unavailable', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/html'
                    })
                });
            }

            try {
                const response = await fetch(event.request);

                console.debug(
                    `${wName} fetch response from network.`,
                    event.request.url
                );

                return storeResponse(event.request, response);
            } catch (error) {
                return unableToResolve();
            }
        })()
    );
});

/**
 * The activate event fires after a service worker has been successfully installed.
 * It is most useful when phasing out an older version of a service worker, as at
 * this point you know that the new worker was installed correctly. In this example,
 * we delete old caches that don't match the version in the worker we just finished
 * installing.
 */
wrk.addEventListener('activate', (event) => {
    console.info(`${wName} activate event triggered.`);
    const promise = async () => {
        // Tell the active service worker to take control of the page immediately.
        await wrk.clients.claim();
        // Feature-detect navigation preloads!
        if (wrk.registration?.navigationPreload) {
            await wrk.registration.navigationPreload.enable();
        }

        // This method will resolve an array of available cache keys.
        const keys = await caches.keys();

        await Promise.all(
            keys
                .filter((key) => {
                    return key.startsWith(cachePrefix) && key !== cacheName;
                })
                .map((key) => {
                    return caches.delete(key);
                })
        );

        console.info(`${wName} activated.`);
    };

    event.waitUntil(promise());
});
