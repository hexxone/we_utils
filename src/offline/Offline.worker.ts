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
const version = '::2.4';

console.debug(`${wName} executing..`);

// The install event fires when the service worker is first installed.
// You can use this event to prepare the service worker to be able to serve
// files while visitors are offline.
wrk.addEventListener('install', (event) => {
    console.debug(`${wName} install event in progress.`);

    // get the path for the .json file which contains the files to-be-cached
    // These resources will be downloaded and cached by the service worker
    // If any resource fails to be downloaded, then the service worker won't be installed.
    const sp = new URL(location.href).searchParams;
    const jsonPath = sp.get('jsonPath');

    const promise = async () => {
        await wrk.skipWaiting();

        // let's request the files to store in cache
        return fetch(jsonPath)
            .then((response) => {
                return response.json();
            })
            // after we received the files to store, we open the cache
            .then((data) => {
                return (
                    caches
                        .open(wName + version)
                        // then map the array and add one-by-one
                        .then((cache) => {
                            return data.map((url) => {
                                return cache.add(url);
                            });
                        })
                );
            });
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
        caches.match(event.request).then(async (cached) => {
            if (cached) {
                console.debug(`${wName} fetch event(cached): `, event.request.url);

                return (cached); // Already has injected headers from when it was stored
            }

            const preload = await event.preloadResponse;

            if (preload) {
                return injectIsolationHeaders(preload);
            }

            function fetchedFromNetwork(response: Response) {
                // Inject headers FIRST, then store the injected version in cache
                const injected = injectIsolationHeaders(response);
                const cacheCopy = injected.clone();

                console.debug(
                    `${wName} fetch response from network.`,
                    event.request.url
                );

                caches
                    .open(wName + version)
                    .then((cache) => { return cache.put(event.request, cacheCopy); })
                    .then(() => {
                        return console.debug(
                            `${wName} fetch response stored in cache.`,
                            event.request.url
                        );
                    });

                return (injected);
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

            return fetch(event.request)
                .then(fetchedFromNetwork, unableToResolve)
                .catch(unableToResolve);
        })
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
        caches
            .keys()
            // We return a promise that settles when all outdated caches are deleted.
            .then((keys) => {
                return Promise.all(
                    // Filter by keys that don't start with the latest version prefix.
                    keys
                        .filter((key) => {
                            return !key.endsWith(version);
                        })
                        // Return a promise that's fulfilled when each outdated cache is deleted.
                        .map((key) => {
                            return caches.delete(key);
                        })
                );
            })
            // completed
            .then(() => {
                console.info(`${wName} activated.`);
            });
    };

    event.waitUntil(promise());
});
