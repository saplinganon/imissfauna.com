import { STREAM_STATUS, STREAM_TYPE } from "../../common/enums"

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: true, result: null })
    }

    res.status(200).json({
        error: false,
        result: {
            ytStreamData: {
                status: STREAM_STATUS.OFFLINE,
                streamInfo: {
                    link: "https://imissfauna.com",
                    title: "Page refresh required",
                    startTime: 1661590060000,
                    thumbnail: null,
                    isMembersOnly: false,
                    streamType: STREAM_TYPE.LIVE_STREAM,
                }
            },
            pastStreamData: null,
        }
    })
}