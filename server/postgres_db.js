import { Client } from "pg"
import { STREAM_TYPE } from "../common/enums"

export class PostgresCoordinator {
    constructor() {
        this.connection = new Client({connectionTimeoutMillis: 3000})
    }

    async _connect() {
        await this.connection.connect()
        return this
    }

    async getCachedStreamInfo(nearTime) {
        let res
        try {
            res = await this.connection.query(
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
        await this.transaction(async (client) => {
            for (let v of streamInfos) {
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
            }
        })
    }

    async setConfig(key, value) {
        try {
            await this.connection.query(`INSERT INTO config VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET val=excluded.val`, [key, value])
        } catch (e) {
            console.error("[setConfig]", "query error:", e)
        }
    }

    async getConfig(key) {
        let res
        try {
            res = await this.connection.query(`SELECT val FROM config WHERE name = $1 LIMIT 1`, [key])
        } catch (e) {
            console.error("[getConfig]", "query error:", e)
            return undefined
        }
        
        return res.rows[0]?.val
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

export async function getCoordinator() {
    return await (new PostgresCoordinator())._connect()
}
