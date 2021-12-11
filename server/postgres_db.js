import { Pool } from "pg"
import { STREAM_TYPE } from "../common/enums"

export class PostgresCoordinator {
    constructor() {
        this.pool = new Pool()
    }

    async getCachedStreamInfo(nearTime) {
        let res
        try {
            res = await this.pool.query(
                `SELECT * FROM cached_stream_info WHERE type != $1 ORDER BY ABS($2 - start_time) LIMIT 1`, [STREAM_TYPE.DEAD, nearTime]
            )
        } catch (e) {
            console.error("[getCachedStreamInfo]", "query error:", e)
            return { streamInfo: null, lastCheck: null }
        }

        let row = res.rows[0]
        if (row) {
            return {
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
            }
        } else {
            return { streamInfo: null, lastCheck: null }
        }
    }

    async updateCache(streamInfos) {
        const ts = Date.now()
        const client = await this.pool.connect()
        try {
            await client.query("BEGIN")
            
            await Promise.all(streamInfos.map(async (v) => {
                await client.query(`
                    INSERT INTO cached_stream_info VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (video_link) DO UPDATE SET
                        video_link      = excluded.video_link,
                        status          = excluded.status,
                        title           = excluded.title,
                        thumbnail       = excluded.thumbnail,
                        start_time      = excluded.start_time,
                        members_only    = excluded.members_only,
                        type            = excluded.type,
                        last_check_time = excluded.last_check_time
                `, [v.videoLink, v.live, v.title, v.thumbnail, v.streamStartTime?.getTime?.() || null, v.isMembersOnly, v.streamType, ts])
            }))

            await client.query("COMMIT")
        } catch (e) {
            await client.query("ROLLBACK")
            console.error("[updateCache]", "query error:", e)
        } finally {
            client.release()
        }
    }

    async setConfig(key, value) {
        try {
            await this.pool.query(`INSERT INTO config VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET val=excluded.val`, [key, value])
        } catch (e) {
            console.error("[setConfig]", "query error:", e)
        }
    }

    async getConfig(key) {
        let res
        try {
            res = await this.pool.query(`SELECT val FROM config WHERE name = $1 LIMIT 1`, [key])
        } catch (e) {
            console.error("[getConfig]", "query error:", e)
            return undefined
        }
        
        return res.rows[0]?.val
    }
}

export async function getCoordinator() {
    if (!global.postgresDB) {
        global.postgresDB = new PostgresCoordinator()
    }

    return global.postgresDB
}
