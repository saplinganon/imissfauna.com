## Config

In .env or the actual environment:

- `WATCH_CHANNEL_ID=XXXX` sets the youtube channel to check for livestream status. Copy
  only the part after /channel/ in the URL (i.e. the `UC...` part)
- `USE_DUMMY_DATA=true` returns fake stream status instead of scraping YT. See 
  getServerSideProps in pages/index.js.
- `PUBLIC_HOST=XXXX` sets the external hostname of the site (e.g. "https://imissfauna.com").
  This is used to make absolute URLs for the embed. Do not leave a trailing slash.

## How to add images

1. Put a .png or .jpg file in public/imagesets/[name]
