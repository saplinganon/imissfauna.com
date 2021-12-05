import { pollLivestreamStatus, pollLivestreamStatusDummy } from "../../server/livestream_poller"

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: true, result: null })
    }

    let apiVal
    if (process.env.USE_DUMMY_DATA === "true") {
        apiVal = await pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID, req.query.mock)
    } else {
        apiVal = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }
    const { result, error } = apiVal

    if (error) {
        console.warn("livestream poll returned error:", error)
        return res.status(200).json({ error: true, result: null })
    }

    return res.status(200).json({
        error: false, 
        result: {
            status: result.live,
            streamInfo: {
                link: result.videoLink,
                title: result.title,
                startTime: result.streamStartTime?.getTime?.() || null,
                thumbnail: result.thumbnail
            }
        }
    })
}