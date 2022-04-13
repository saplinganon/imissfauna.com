import { Client } from "pg"
import { STREAM_TYPE } from "../common/enums"

export class PostgresCoordinator {
    constructor() {
        this.connection = null
    }

    async _connect() {
        for (let i = 0; i < 3; ++i) {
            try {
                this.connection = new Client({connectionTimeoutMillis: 1500})
                await this.connection.connect()
                return this
            } catch (e) {
                console.error("[_connect]", "error connecting", e)
            }
        }

        throw new Error("[_connect]: all connection attempts failed")
    }

    async getCachedStreamInfo(nearTime) {
        console.debug("[getCachedStreamInfo]", "enter")
        let res
        try {
            res = await this.connection.query(
                `SELECT * FROM cached_stream_info WHERE type != $1 ORDER BY ABS($2 - start_time) LIMIT 1`, [STREAM_TYPE.DEAD, nearTime]
            )
        } catch (e) {
            console.error("[getCachedStreamInfo]", "query error:", e)
            return { streamInfo: null, lastCheck: null }
        }

        console.debug("[getCachedStreamInfo]", "exit")
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
        console.debug("[updateCache]", "enter")
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
        console.debug("[updateCache]", "exit")
    }

    async setConfig(key, value) {
        console.debug("[setConfig]", "enter")
        try {
            await this.connection.query(`INSERT INTO config VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET val=excluded.val`, [key, value])
        } catch (e) {
            console.error("[setConfig]", "query error:", e)
        }
        console.debug("[setConfig]", "exit")
    }

    async getConfig(key) {
        console.debug("[getConfig]", "enter")
        let res
        try {
            res = await this.connection.query(`SELECT val FROM config WHERE name = $1 LIMIT 1`, [key])
        } catch (e) {
            console.error("[getConfig]", "query error:", e)
            return undefined
        }

        console.debug("[getConfig]", "exit")
        return res.rows[0]?.val
    }
    
    async getVod() {
        console.debug("[getVod]", "enter")
        let res
        try {
            res = await this.connection.query(`SELECT video_link, title, thumbnail, uploaded_date, _last_valid FROM vod LIMIT 1 OFFSET (floor(random() * (SELECT num_vods FROM vod_count)))`)
        } catch (e) {
            console.error("[getVod]", "query error:", e)
            return undefined
        }

        console.debug("[getVod]", "exit")
        return res.rows[0]
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
