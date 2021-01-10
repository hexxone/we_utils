/**
 * 
 * @author D.Thiele @https://hexx.one
 *
 * @license
 * Copyright (c) 2020 D.Thiele All rights reserved.  
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

"use strict";

const wrk: ServiceWorker = self as any;

// A version number is useful when updating the worker logic,
// allowing you to remove outdated cache entries during the update.
const version = 'v2.4::';
const wName = "[OfflineWorker] ";

console.info(wName + 'executing.');

// The install event fires when the service worker is first installed.
// You can use this event to prepare the service worker to be able to serve
// files while visitors are offline.
wrk.addEventListener("install", function (event: any) {
  console.info(wName + 'install event in progress.');

  // get the path for the .json file which contains the files to-be-cached
  // These resources will be downloaded and cached by the service worker
  // If any resource fails to be downloaded, then the service worker won't be installed.
  var jsonPath = new URL(location.href).searchParams.get('jsonPath');

  // Using event.waitUntil(p) blocks the installation process on the provided
  // promise. If the promise is rejected, the service worker won't be installed.
  event.waitUntil(
    // let's request the files to store in cache
    fetch(jsonPath)
      .then(response => response.json())
      // after we received the files to store, we open the cache
      .then(data => caches.open(version + 'fundamentals')
        // then map the array and add one-by-one
        .then(cache => data.map((url) => cache.add(url))))
      // log success
      .then(() => console.info(wName + 'install completed'))
  );
});

// The fetch event fires whenever a page controlled by this service worker requests
// a resource. This isn't limited to `fetch` or even XMLHttpRequest. Instead, it
// comprehends even the request for the HTML page on first load, as well as JS and
// CSS resources, fonts, any images, etc.
wrk.addEventListener("fetch", function (event: any) {
  //console.info(wName + 'fetch event in progress.');

  if (event.request.method !== 'GET') {
    console.info(wName + 'fetch event ignored.', event.request.method, event.request.url);
    return;
  }

  // This method returns a promise that resolves to a cache entry matching
  // the request. Once the promise is settled, we can then provide a response
  // to the fetch request.
  event.respondWith(
    caches.match(event.request)
      .then(async (cached) => {
        // return immediately if cache successfull
        if (cached) {
          console.info(wName + 'fetch event(cached): ', event.request.url);
          return cached
        }

        // Else, use the preloaded response, if it's there
        const preload = await event.preloadResponse;
        if (preload) return preload;

        // We copy the response before replying to the network request.
        // This is the response that will be stored on the ServiceWorker cache.
        function fetchedFromNetwork(response) {
          var cacheCopy = response.clone();
          console.info(wName + 'fetch response from network.', event.request.url);
          // We open a cache to store the response for this request.
          caches.open(version + 'pages')
            .then((cache) => cache.put(event.request, cacheCopy))
            .then(() => console.info(wName + 'fetch response stored in cache.', event.request.url));
          // Return the response so that the promise is settled in fulfillment.
          return response;
        }

        /* When this method is called, it means we were unable to produce a response
           from either the cache or the network. This is our last opportunity
           to produce a meaningful response even when all else fails. 
           E.g.
             - Test the Accept header and then return one of the `offlineFundamentals`
               e.g: `return caches.match('/some/cached/image.png')`
             - consider the origin. It's easier to decide what "unavailable" means
               for requests against your origins than for requests against a third party,
               such as an ad provider.
             - Generate a Response programmaticaly, as shown below, and return that.
        */
        function unableToResolve() {
          console.info(wName + 'fetch request failed in both cache and network.');
          return new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/html'
            })
          });
        }

        // fallback to fetching from network
        return fetch(event.request)
          // We handle the network request with success and failure scenarios.
          .then(fetchedFromNetwork, unableToResolve)
          // we are done
          .then(() => console.info(wName + 'fetch event(networked): ', event.request.url))
          // We should catch errors on the fetchedFromNetwork handler as well.
          .catch(unableToResolve);
      })
  );
});

/* The activate event fires after a service worker has been successfully installed.
   It is most useful when phasing out an older version of a service worker, as at
   this point you know that the new worker was installed correctly. In this example,
   we delete old caches that don't match the version in the worker we just finished
   installing.
*/
wrk.addEventListener("activate", function (event: any) {
  console.info(wName + 'activate event in progress.');
  event.waitUntil(async () => {
    // Feature-detect navigation preloads!
    if (self['registration'] && self['registration'].navigationPreload) {
      await self['registration'].navigationPreload.enable();
    }

    // This method will resolve an array of available cache keys.
    caches.keys()
      // We return a promise that settles when all outdated caches are deleted.
      .then(keys => Promise.all(
        // Filter by keys that don't start with the latest version prefix.
        keys.filter((key) => !key.startsWith(version))
          // Return a promise that's fulfilled when each outdated cache is deleted.
          .map((key) => caches.delete(key))))
      // completed
      .then(() => console.info(wName + 'activate completed.'));
  });

  // Tell the active service worker to take control of the page immediately.
  if (wrk['clients']) wrk['clients'].claim();
});