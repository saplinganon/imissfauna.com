## Config

In .env or the actual environment:

- `WATCH_CHANNEL_ID=XXXX` sets the youtube channel to check for livestream status. Copy
  only the part after /channel/ in the URL (i.e. the `UC...` part)
- `USE_DUMMY_DATA=true` returns fake stream status instead of scraping YT. See 
  getServerSideProps in pages/index.js.

## How to add images

1. Put a .png or .jpg file in public/imagesets/[name]
