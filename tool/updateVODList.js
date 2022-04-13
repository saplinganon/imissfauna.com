require('dotenv').config()
const process = require("process")
const fetch = require('node-fetch')
const sqlite3 = require("sqlite3")
const decode = require("html-entities").decode

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
    let ret = {}
    ret.videoID = item.id.videoId
    ret.title = decode(item.snippet.title)
    ret.thumbnail = item.snippet.thumbnails.medium.url
    ret.uploaded_date = Date.parse(item.snippet.publishedAt)
    ret.length_seconds = 0
    return ret
}

async function main() {
    const db = new sqlite3.Database(process.env.SQLITE_DB_PATH)
    const stmt = db.prepare(`
        INSERT INTO vod VALUES (?, ?, ?, ?, ?, 0, 0, 0)
        ON CONFLICT (video_link) DO UPDATE SET
            video_link      = excluded.video_link,
            title          = excluded.title,
            thumbnail           = excluded.thumbnail,
            uploaded_date       = excluded.uploaded_date,
            length_seconds      = excluded.length_seconds,
            members_only    = excluded.members_only,
            _last_valid            = excluded._last_valid,
            _seq = excluded._seq
    `)

    let nextUrl = makeAPIURL()
    while (nextUrl) {
        const resp = await fetch(nextUrl)
        if (resp.status !== 200) {
            console.error("code:", resp.status)
            console.error(await resp.json())
            break
        }
        
        const data = await resp.json()
        data.items.forEach((video) => {
            // console.log(video)
            const v = collect(video)
            // console.log("video: ", v.videoID, v.title)
            stmt.run([
                v.videoID, v.title, v.thumbnail, v.uploaded_date, v.length_seconds
            ])
        })
        
        if (data.nextPageToken) {
            nextUrl = makeAPIURL(data.nextPageToken)
        } else {
            break
        }
    }
    
    stmt.finalize()
    db.close()
}

main().then(() => {
    process.exit(0)
})