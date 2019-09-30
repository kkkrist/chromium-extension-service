# Chromium Extension Service

This is a proxy service required by [Chromium Update Notifications](https://github.com/kkkrist/chromium-notifier) to fetch version info for installed extensions. It enables bypassing of [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) restrictions of the [Chrome Web Store](https://chrome.google.com/webstore/category/extensions) and tracking of GitHub-hosted extensions (see below).

## Requirements

- [Zeit's Now](https://zeit.co/)
- A MongoDB database (for persistence)
- The environment variable `MONGODB_URI` provided via Now Secrets (prod) or a local `.env` file (dev)

## Usage

Send a `POST` request to `/api` with the following JSON body:

```json
{
  "prodversion": "<chrome version>",
  "extensions": [
    { "id": "<extension id>",  "updateUrl": "<URL to Omaha-compatible endpoint"},
    { "id": "<extension id>",  "updateUrl": "<URL to Omaha-compatible endpoint"},
    …
  ]
}
```

The service will then respond with an array consisting of version info and meta data of said extensions:

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

Note: This is all the database ever contains, nothing else – particularly client (end user) data  – is ever collected.

## Developers

If you want to have your GitHub-hosted Chromium extension tracked via this service, follow these steps:

1. Include `github:<user>/<repo>` as `update_url` in your `manifest.json`.
2. Make sure to tag your versions. E.g., if the current `version` specified in your `manifest.json` equals to `1.2.3`, there needs to be a tag named `v1.2.3` in your repo to make the download links work.
