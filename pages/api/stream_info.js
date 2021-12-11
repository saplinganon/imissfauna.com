import { getDatabase, getKnownStreamData, getLiveStreamData, getPastStream, findExtraStreams } from "../../server/data_sources"

function chooseBest(streams) {
    let nearest = 0
    let best = null
    const now = Date.now()
    for (let streamInfo of streams) {
        if (streamInfo.type === STREAM_TYPE.DEAD) {
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

    let useStreamInfo, pastStreamPromise = getPastStream()
    if (!(useStreamInfo = await getKnownStreamData(coordinator))) {
        const { result, error } = await getLiveStreamData(req.query.mock)
        if (error) {
            console.warn("livestream poll returned error:", error)
            useStreamInfo = null
        } else {
            if (result.videoLink && process.env.USE_DUMMY_DATA !== "true") {
                await coordinator.updateCache([result])
            } 
    
            useStreamInfo = result
        }

        if (!useStreamInfo?.videoLink) {
            useStreamInfo = chooseBest(await findExtraStreams(coordinator))
        }
    }

    const { pastResult, pastError } = await pastStreamPromise

    if (pastError) {
        console.warn("holodex poll returned error:", pastError)
    }

    if (pastError && !useStreamInfo) {
        // No useful information
        return res.status(200).json({ error: true, result: null })
    }

    let responseValue = {
        error: false, 
        result: {
            ytStreamData: null,
            pastStreamData: null,
        }
    }

    if (useStreamInfo) {
        responseValue.result.ytStreamData = {
            status: useStreamInfo.live,
            streamInfo: {
                link: useStreamInfo.videoLink,
                title: useStreamInfo.title,
                startTime: useStreamInfo.streamStartTime?.getTime?.() || null,
                thumbnail: useStreamInfo.thumbnail,
                isMembersOnly: useStreamInfo.isMembersOnly,
                streamType: useStreamInfo.streamType,
            }
        }
    }

    if (pastResult) {
        responseValue.result.pastStreamData = pastResult
    }

    return res.status(200).json(responseValue)
}