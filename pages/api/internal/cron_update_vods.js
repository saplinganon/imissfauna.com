import { fetchWithTimeout } from "../../../common/utils"
import { Client as pgClient } from "pg"
import { decode } from "html-entities"
import sqlite3 from "sqlite3"

// We have our own DB classes in this file to match updateVODList.
// Don't refactor this out for now.

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

export default async function handler(req, res) {
    if (!process.env.CRON_SECRET_KEY) {
        res.status(400).json({ error: "Feature not enabled." })
        return
    }

    if (req.query.key !== (process.env.CRON_SECRET_KEY || "")) {
        res.status(403).json({ error: "Incorrect key." })
        return
    }

    let db
    if (process.env.DATABASE_TYPE === "sqlite3") {
        db = new SQLiteDatabase()
    } else {
        db = await (new PostgresDatabase())._connect()
    }
    
    let nextUrl = makeAPIURL()
    let videosConsidered = 0
    let error = null
    while (nextUrl && videosConsidered < 100) {
        const resp = await fetchWithTimeout(nextUrl, {}, 0, "YT API - Update VODs")
        if (resp.status !== 200) {
            console.error("[Update VODs] YouTube API error: code:", resp.status)
            console.error(await resp.json())
            error = { what: "ytapi", code: resp.status }
            break
        }
        
        const data = await resp.json()
        await db.insertVods(data.items.map((video) => collect(video)))
        videosConsidered += data.items.length
        
        if (data.nextPageToken) {
            nextUrl = makeAPIURL(data.nextPageToken)
        } else {
            break
        }
    }
    
    await db.teardown()
    return res.status(200).json({ result: { videosConsidered } })
}
