import sqlite3 from "sqlite3"
import { STREAM_TYPE } from "../common/enums"

export class SQLiteCoordinator {
    constructor() {
        this.connection = new sqlite3.Database(process.env.SQLITE_DB_PATH)
    }

    getCachedStreamInfo(nearTime, _) {
        return new Promise((resolve, reject) => {
            this.connection.get(`SELECT * FROM cached_stream_info WHERE type != ? ORDER BY ABS(? - start_time)`, [STREAM_TYPE.DEAD, nearTime], (err, row) => {
                if (err) {
                    console.error("[getCachedStreamInfo]", "query error:", err)
                    return resolve({ streamInfo: null, lastCheck: null })
                } 

                if (row) {
                    resolve({
                        streamInfo: {
                            live: row.status,
                            title: row.title,
                            thumbnail: row.thumbnail,
                            videoLink: row.video_link,
                            streamStartTime: row.start_time ? new Date(row.start_time) : null,
                            isMembersOnly: !!row.members_only,
                            streamType: row.type,
                        },
                        lastCheck: row.last_check_time,
                    })
                } else {
                    resolve({ streamInfo: null, lastCheck: null })
                }
            })
        })
    }

    async updateCache(streamInfos, _) {
        const ts = Date.now()
        this.connection.serialize(() => {
            const stmt = this.connection.prepare(`
                INSERT INTO cached_stream_info VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (video_link) DO UPDATE SET
                    video_link      = excluded.video_link,
                    status          = excluded.status,
                    title           = excluded.title,
                    thumbnail       = excluded.thumbnail,
                    start_time      = excluded.start_time,
                    members_only    = excluded.members_only,
                    type            = excluded.type,
                    last_check_time = excluded.last_check_time
            `)

            streamInfos.forEach((v) => {
                stmt.run([v.videoLink, v.live, v.title, v.thumbnail, v.streamStartTime?.getTime?.() || null, v.isMembersOnly, v.streamType, ts])
            })
            
            stmt.finalize()
        })
    }

    async setConfig(key, value, _) {
        this.connection.run(`INSERT INTO config VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET val=excluded.val`, [key, value])
    }

    getConfig(key, _) {
        return new Promise((resolve, reject) => {
            this.connection.get(`SELECT val FROM config WHERE name = ?`, [key], (err, row) => {
                if (err) {
                    console.error("[getConfig]", "query error:", err)
                    return resolve(undefined)
                } 
                
                resolve(row?.val)
            })
        })
    }
    
    getVod() {
        return new Promise((resolve, reject) => {
            this.connection.get(`SELECT video_link, title, thumbnail, uploaded_date, _last_valid FROM vod ORDER BY random() LIMIT 1`, (err, row) => {
                if (err) {
                    console.error("[getVod]", "query error:", err)
                    return resolve(undefined)
                } 
                
                resolve(row)
            })
        })
    }

    async transaction(f) {
        return await f(this)
    }

    teardown() {
        return new Promise((resolve) => {
            this.connection.close((err) => {
                if (err) {
                    console.error("[teardown]", err)
                }

                resolve()
            })
        })
    }
}

export async function getCoordinator() {
    return new SQLiteCoordinator()
}
