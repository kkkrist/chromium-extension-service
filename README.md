# Chromium Extension Service

This is a service used by [Chromium Update Notifications](https://github.com/kkkrist/chromium-notifier) for error tracking and to increase privacy when fetching update info for installed extensions from the Chrome Web Store (strips cookies with personal data).

## Requirements

- [Vercel](https://vercel.com/)
- A MongoDB database (for persistence and caching)
- The environment variable `MONGODB_URI` provided via Vercel Secrets (prod) or a local `.env` file (dev)

## Usage

Note: The responses you see here is all that's ever saved anywhere, nothing else – particularly client (end user) data – is collected.

### Error tracking

Helps improving the extension.

Send a `POST` request to `/api/errorlogs` with the following JSON body:

```json
{
  "error": "JSON.stringify(<Error object>, Object.getOwnPropertyNames(<Error object>))",
  "pluginVersion": "<plugin version used>"
}
```

The service will then store the following document in the database:

```json
{
  "_id": "5dc89e461f8c375aa22424cc",
  "createdAt": "2019-11-10T23:33:26.525Z",
  "error": "<Error object>",
  "hashedIp": "1a3a493b",
  "pluginVersion": "<plugin version used>",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.390 4.97 Safari/537.36"
}
```

### Version info for installed extensions

When your browser requests data from `update_url` endpoints directly, cookies with personal data might be transmitted along the way. In my test set-up, requests to `update_url`s of extensions obtained from Chrome Web Store included the following personal data and adtech-related cookies (even though I wasn't logged in into any Google account):

* [1P_JAR](https://cookiepedia.co.uk/cookies/APISID/1P_JAR)
* [APISID](https://cookiepedia.co.uk/cookies/APISID/APISID)
* [HSID](https://cookiepedia.co.uk/cookies/APISID/HSID)
* [NID](https://cookiepedia.co.uk/cookies/APISID/NID)
* [SAPISID](https://cookiepedia.co.uk/cookies/APISID/SAPISID)
* [SID](https://cookiepedia.co.uk/cookies/APISID/SID)
* [SIDCC](https://cookiepedia.co.uk/cookies/APISID/SIDCC)
* [SSID](https://cookiepedia.co.uk/cookies/APISID/SSID)

(See also [https://policies.google.com/technologies/types](https://policies.google.com/technologies/types))

If you don't want these cookies to be transmitted, you can use this proxy endpoint to request version info for installed extensions. Enabling "Increase privacy" in [Chromium Update Notifications](https://github.com/kkkrist/chromium-notifier) does exactly that.

Send a `POST` request to `/api` with the following JSON body:

```json
{
  "prodversion": "<Chromium version>",
  "extensions": [
    { "id": "<extension id>",  "updateUrl": "<URL to Omaha-compatible endpoint>"},
    { "id": "<extension id>",  "updateUrl": "<URL to Omaha-compatible endpoint>"},
    …
  ]
}
```

The service will respond with an array consisting of version info and meta data of said extensions:

```json
[
  {
    "codebase": "https://clients2.googleusercontent.com/crx/blobs/QgAAAC6zw0qH2DJtnXe8Z7rUJP0-NOcA97MmZN4Ln1fODAHweMXNXTmjgerLCPXhmXNXwEVIEkarzGIkPHrBXBeXqsjm4UfxBJBNpSCt104KOFaeAMZSmuWy9iapD9CEzrK8OfYl3Nvw2dw3Iw/extension_347_0_0_0.crx",
    "id": "chlffgpmiacpedhhbkiomidkjlcfhogd",
    "fp": "1.c989572d0b4c9c933f7c97224fbc49612e210b2dba994f90c87491cac53282dc",
    "hash_sha256": "c989572d0b4c9c933f7c97224fbc49612e210b2dba994f90c87491cac53282dc",
    "prodversion": "77.0.3865.90",
    "protected": "0",
    "size": "443571",
    "status": "ok",
    "timestamp": 1569175526216,
    "updateUrl": "https://clients2.google.com/service/update2/crx",
    "version": "347",
    "_id": "5d86ab09f5eeeb001cc06c34"
  },
  {
    …
  }
]
```
