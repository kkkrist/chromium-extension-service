# Chromium Extension Service

This is a service used by [Chromium Update Notifications](https://github.com/kkkrist/chromium-notifier) primarily for error tracking. Legacy versions use it to fetch version info for installed extensions.

## Requirements

- [Zeit's Now](https://zeit.co/)
- A MongoDB database (for persistence)
- The environment variable `MONGODB_URI` provided via Now Secrets (prod) or a local `.env` file (dev)

## Usage

Note: The responses you see here is all that's ever saved anywhere, nothing else – particularly client (end user) data – is collected.

### Error tracking

Send a `POST` request to `/api/errorlogs` with the following JSON body:

```json
{
  "error": "JSON.stringify(<Error object>, Object.getOwnPropertyNames(<Error object>))"
}
```

The service will then store the following info in the database:

```json
{
  "_id": "5dc89e461f8c375aa22424cc",
  "createdAt": "2019-11-10T23:33:26.525Z",
  "error": "<Error object>",
  "hashedIp": "1a3a493b",
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.390 4.97 Safari/537.36"
}
```

### Version info for installed extensions

Note: This is only used by Chromium Update Notifications prior to `v1.7.0`. Newer versions will hit `updateUrl` endpoints directly.

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
