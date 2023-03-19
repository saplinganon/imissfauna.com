## Config

The site is configured using environment variables. Set the following in your .env file,
or the actual environment of your server process:

- `WATCH_CHANNEL_ID=XXXX` sets the youtube channel to check for livestream status. Copy
  only the part after /channel/ in the URL (i.e. the `UC...` part)
- `USE_DUMMY_DATA=true` returns fake stream status instead of scraping YT. See 
  getServerSideProps in pages/index.js.
- `PUBLIC_HOST=XXXX` sets the external hostname of the site (e.g. "https://imissfauna.com").
  This is used to make absolute URLs for the embed. Do not leave a trailing slash.
- `WATCH_TWITTER_ID=XXXX` Twitter user ID of an account that will post YouTube links.
  Not the @ handle, but the unique numeric ID.
- `YOUTUBE_API_KEY=XXXX` for refreshing members/premiere info. Can be created for free at
  https://console.cloud.google.com/apis/api/youtube.googleapis.com/credentials (Google account required)
- `TWITTER_BEARER_TOKEN=XXXX` for loading tweets, which we use to discover members/premiere
  streams. Can be issued from https://developer.twitter.com/ , which is free but requires
  your account to be approved as a Twitter dev.
- `WATCH_CHANNEL_HANDLE=@xxxx` sets the channel link at the bottom of the page. If unset,
  uses the old /channel/... URL format.

One of the following variable sets are needed to configure the database:

If using SQLite:

- `DATABASE_TYPE=sqlite`
- `SQLITE_DB_PATH=./data.db`

If using Postgres:

- `DATABASE_TYPE=postgres`
- `PGUSER=xxx`
- `PGPASSWORD=xxx`
- `PGPORT=xxx`
- `PGHOST=xxx`
- `PGDATABASE=imfdev`

(Any PG environment variables supported by libpq can also be set.
See https://www.postgresql.org/docs/9.3/libpq-envars.html)

You will probably want a connection pooler like pgbouncer if you're deploying on a serverless platform
like vercel.

## Initializing the database

Run either init_postgres.sql or init_sqlite3.sql on your database to create the necessary tables.

## How to add images

1. Put a .png or .jpg file in public/imagesets/[name]

## How to add languages

1. Open `next.config.js` and add your language's locale code to the `locales` array
   (e.g. `locales: ["en"],` -> `locales: ["en", "fr"],`). Locale codes can be either just
   the language (`en`) or include a region (`en-US`).
2. Open `lang/strings.js` and copy/paste the entire English strings block. Replace the
   locale code in `AllStrings["en"]` with the code you added in step 1.
3. Translate all the newly copypasted strings.
4. Make a pull request.
