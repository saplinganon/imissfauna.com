require('dotenv').config()
const process = require("process")
const fetch = require("node-fetch")
const sqlite3 = require("sqlite3")
const decode = require("html-entities").decode
const pgClient = require("pg").Client

class PostgresDatabase {
    constructor() {
        this.connection = null
    }
    
    async _connect() {
        for (let i = 0; i < 3; ++i) {
            try {
                this.connection = new pgClient({connectionTimeoutMillis: 5000})
                await this.connection.connect()
                return this
            } catch (e) {
                console.error("[_connect]", "error connecting", e)
            }
        }
    
        throw new Error("[_connect]: all connection attempts failed")
    }
    
    async insertVods(vodEntries) {
        const ts = Date.now()
        console.debug("[insertVod]", "enter")
        await this.transaction(async (client) => {
            for (let vod of vodEntries) {
                await client.query(`
                    INSERT INTO vod VALUES ($1, $2, $3, $4, $5, false, $6)
                    ON CONFLICT (video_link) DO UPDATE SET
                        video_link             = excluded.video_link,
                        title                  = excluded.title,
                        thumbnail              = excluded.thumbnail,
                        uploaded_date          = excluded.uploaded_date,
                        length_seconds         = excluded.length_seconds,
                        members_only           = excluded.members_only,
                        _last_valid            = excluded._last_valid
                `, [vod.videoID, vod.title, vod.thumbnail, vod.uploaded_date, vod.length_seconds, ts])
            }
        })
        console.debug("[insertVod]", "exit")
    }
    
    async transaction(f) {
        let retVal
        try {
            await this.connection.query("BEGIN")
            retVal = await f(this.connection)
            await this.connection.query("COMMIT")
        } catch (e) {
            await this.connection.query("ROLLBACK")
            console.error("[transaction]", "query error:", e)
        }
        return retVal
    }
    
    async teardown() {
        console.debug("[teardown]", "closing connection now")
        await this.connection.end()
    }   
}

class SQLiteDatabase {
    constructor() {
        this.connection = new sqlite3.Database(process.env.SQLITE_DB_PATH)
    }

    async insertVods(vodEntries) {
        const stmt = this.connection.prepare(`
            INSERT INTO vod VALUES (?, ?, ?, ?, ?, 0, 0)
            ON CONFLICT (video_link) DO UPDATE SET
                video_link          = excluded.video_link,
                title               = excluded.title,
                thumbnail           = excluded.thumbnail,
                uploaded_date       = excluded.uploaded_date,
                length_seconds      = excluded.length_seconds,
                members_only        = excluded.members_only,
                _last_valid         = excluded._last_valid
        `)

        vodEntries.forEach((v) => 
            stmt.run([
                v.videoID, v.title, v.thumbnail, v.uploaded_date, v.length_seconds
            ])
        )
        stmt.finalize()
    }

    async teardown() {
        this.connection.close()
    }
}

function makeAPIURL(pageToken) {
    const apiKey = process.env.YOUTUBE_API_KEY
    const channelID = process.env.WATCH_CHANNEL_ID
    let pageSpecifier = "&"
    if (pageToken) {
        pageSpecifier = `pageToken=${pageToken}&`
    }
    
    return `https://youtube.googleapis.com/youtube/v3/search?${pageSpecifier}part=snippet&channelId=${channelID}&maxResults=500&order=date&type=video&key=${apiKey}`
}

function collect(item) {
    return {
        videoID: item.id.videoId,
        title: decode(item.snippet.title),
        thumbnail: item.snippet.thumbnails.medium.url,
        uploaded_date: Date.parse(item.snippet.publishedAt),
        length_seconds: 0
    }
}

async function main() {
    let db
    if (process.env.DATABASE_TYPE === "sqlite3") {
        db = new SQLiteDatabase()
    } else {
        db = await (new PostgresDatabase())._connect()
    }
    
    let nextUrl = makeAPIURL()
    while (nextUrl) {
        const resp = await fetch(nextUrl)
        if (resp.status !== 200) {
            console.error("code:", resp.status)
            console.error(await resp.json())
            break
        }
        
        const data = await resp.json()
        await db.insertVods(data.items.map((video) => collect(video)))
        
        if (data.nextPageToken) {
            nextUrl = makeAPIURL(data.nextPageToken)
        } else {
            break
        }
    }
    
    await db.teardown()
}

main().then(() => {
    process.exit(0)
})