import { API_EPOCH, STREAM_STATUS, STREAM_TYPE } from "../../../common/enums"
import { findExtraStreams, getDatabase, getKnownStreamData, getLiveStreamData } from "../../../server/data_sources"

function chooseBest(streams) {
    if (!streams) {
        return null
    }

    let nearest = 0
    let best = null
    const now = Date.now()
    for (let streamInfo of streams) {
        if (streamInfo.streamType === STREAM_TYPE.DEAD) {
            continue
        }
        if (streamInfo.live === STREAM_STATUS.LIVE) {
            return streamInfo
        }

        if (!best || Math.abs(streamInfo.streamStartTime.getTime() - now) < nearest) {
            nearest = streamInfo.streamStartTime.getTime() - now
            best = streamInfo
        }
    }

    return best
}

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: true, result: null })
    }

    const coordinator = await getDatabase()

    if (process.env.USE_DUMMY_DATA !== "true") {
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }

    let useStreamInfo = await getKnownStreamData(coordinator)
    if (!useStreamInfo) {
        const { result, error } = await getLiveStreamData(req.query.mock)
        if (error) {
            console.warn("livestream poll returned error:", error)
            useStreamInfo = null
        } else {
            if (result.videoLink) {
                await coordinator.updateCache([result])
            } 

            useStreamInfo = result
        }

        if (!useStreamInfo?.videoLink) {
            const exResult = chooseBest(await findExtraStreams(coordinator))
            if (exResult) {
                useStreamInfo = exResult
            }
        }
    }

    if (!useStreamInfo) {
        res.status(503).json({ error: true, result: null })
        await coordinator.teardown()
        return
    }

    res.status(200).json({
        error: false, 
        result: {
            status: useStreamInfo.live,
            streamInfo: {
                link: useStreamInfo.videoLink,
                title: useStreamInfo.title,
                startTime: useStreamInfo.streamStartTime?.getTime?.() || null,
                thumbnail: useStreamInfo.thumbnail,
                isMembersOnly: useStreamInfo.isMembersOnly,
                streamType: useStreamInfo.streamType,
            }
        },
        serverVersion: API_EPOCH
    })
    await coordinator.teardown()
}