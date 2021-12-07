import { STREAM_STATUS } from "../../common/enums"
import { pollLivestreamStatus, pollLivestreamStatusDummy } from "../../server/livestream_poller"
import { pollPaststreamStatus } from "../../server/paststream_poller"

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: true, result: null })
    }

    let ytLiveVal
    if (process.env.USE_DUMMY_DATA === "true") {
        ytLiveVal = await pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID, req.query.mock)
    } else {
        ytLiveVal = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }
    const { result: ytResult, error: ytError } = ytLiveVal

    let pastError = null, pastResult
    if (ytError || (ytResult.live !== STREAM_STATUS.LIVE && ytResult.live !== STREAM_STATUS.STARTING_SOON)) {
        const pastVal = await pollPaststreamStatus(process.env.WATCH_CHANNEL_ID)
        pastError = pastVal.error
        pastResult = pastVal.result
    }
    
    if (pastError || ytError) {
        console.warn("poll returned error(s):", { pastError, ytError })
    }

    if (pastError && ytError) {
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

    if (ytResult) {
        responseValue.result.ytStreamData = {
            status: ytResult.live,
            streamInfo: {
                link: ytResult.videoLink,
                title: ytResult.title,
                startTime: ytResult.streamStartTime?.getTime?.() || null,
                thumbnail: ytResult.thumbnail
            }
        }
    }

    if (pastResult) {
        responseValue.result.pastStreamData = pastResult
    }

    return res.status(200).json(responseValue)
}