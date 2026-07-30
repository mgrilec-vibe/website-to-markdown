Baseline Widely available \*

This feature is well established and works across many devices and browser versions. It’s been available across browsers since March 2017.

\* Some parts of this feature may have varying levels of support.

-   [Learn more](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)
-   [See full compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#browser_compatibility)

The **`fetch()`** method of the [`Window`](https://developer.mozilla.org/en-US/docs/Web/API/Window) interface starts the process of fetching a resource from the network, returning a promise that is fulfilled once the response is available.

The promise resolves to the [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object representing the response to your request.

A `fetch()` promise only rejects when the request fails, for example, because of a badly-formed request URL or a network error. A `fetch()` promise _does not_ reject if the server responds with HTTP status codes that indicate errors (`404`, `504`, etc.). Instead, a `then()` handler must check the [`Response.ok`](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok) and/or [`Response.status`](https://developer.mozilla.org/en-US/docs/Web/API/Response/status) properties.

The `fetch()` method is controlled by the `connect-src` directive of [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy) rather than the directive of the resources it's retrieving.

**Note:** The `fetch()` method's parameters are identical to those of the [`Request()`](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request "Request()") constructor.

## [Syntax](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#syntax)

### [Parameters](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#parameters)

[`resource`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#resource)

This defines the resource that you wish to fetch. This can either be:

-   A string or any other object with a [stringifier](https://developer.mozilla.org/en-US/docs/Glossary/Stringifier) — including a [`URL`](https://developer.mozilla.org/en-US/docs/Web/API/URL) object — that provides the URL of the resource you want to fetch. The URL may be relative to the base URL, which is the document's [`baseURI`](https://developer.mozilla.org/en-US/docs/Web/API/Node/baseURI "baseURI") in a window context, or [`WorkerGlobalScope.location`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/location) in a worker context.
-   A [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object.

[`options` Optional](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#options)

A [`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit) object containing any custom settings that you want to apply to the request.

### [Return value](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#return_value)

A [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) that resolves to a [`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response) object.

### [Exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#exceptions)

`AbortError` [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException)

The request was aborted due to a call to the [`AbortController`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) [`abort()`](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort "abort()") method.

`NotAllowedError` [`DOMException`](https://developer.mozilla.org/en-US/docs/Web/API/DOMException)

Thrown if:

-   Use of the [Topics API](https://developer.mozilla.org/en-US/docs/Web/API/Topics_API) is specifically disallowed by a [`browsing-topics`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/browsing-topics) [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy), and `browsingTopics` is set to `true`.
-   Use of [Private State Token API](https://developer.mozilla.org/en-US/docs/Web/API/Private_State_Token_API) operations is specifically disallowed by a [`private-state-token-issuance`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/private-state-token-issuance) or [`private-state-token-redemption`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/private-state-token-redemption) [Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy), and the `privateToken` option is specified, including a disallowed `privateToken.operation` type.

[`TypeError`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError)

Can occur for the following reasons:

-   The requested URL is invalid.
-   The requested URL includes credentials (username and password).
-   The [`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit) object passed as the value of `options` included properties with invalid values.
-   The request is blocked by a permissions policy.
-   There is a network error (for example, because the device does not have connectivity).
-   The `privateToken` init option is specified, including a `privateToken.operation` type of `send-redemption-record`, and the `privateToken.issues` array was empty or not set, or one or more of the specified `issuers` are not trustworthy, HTTPS URLs.

## [Examples](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#examples)

In our [Fetch Request example](https://github.com/mdn/dom-examples/tree/main/fetch/fetch-request "External link (opens in new tab)") (see [Fetch Request live](https://mdn.github.io/dom-examples/fetch/fetch-request/ "External link (opens in new tab)")) we create a new [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object using the relevant constructor, then fetch it using a `fetch()` call. Since we are fetching an image, we run [`Response.blob()`](https://developer.mozilla.org/en-US/docs/Web/API/Response/blob) on the response to give it the proper MIME type so it will be handled properly, then create an Object URL of it and display it in an [`<img>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img) element.

In our [Fetch Request with init example](https://github.com/mdn/dom-examples/tree/main/fetch/fetch-request-with-init "External link (opens in new tab)") (see [Fetch Request init live](https://mdn.github.io/dom-examples/fetch/fetch-request-with-init/ "External link (opens in new tab)")) we do the same thing except that we pass in an _options_ object when we invoke `fetch()`. In this case, we can set a [`Cache-Control`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) value to indicate what kind of cached responses we're okay with:

You could also pass the `init` object in with the `Request` constructor to get the same effect:

You can also use an object literal as `headers` in `init`:

The [Using fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch) article provides more examples of using `fetch()`.

## [Specifications](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#specifications)

| Specification |
| --- |
| Fetch# fetch-method |

## [Browser compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#browser_compatibility)

## [See also](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch#see_also)

-   [`WorkerGlobalScope.fetch()`](https://developer.mozilla.org/en-US/docs/Web/API/WorkerGlobalScope/fetch)
-   [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
-   [ServiceWorker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
-   [HTTP access control (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
-   [HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP)
