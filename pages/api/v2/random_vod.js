import { getDatabase } from "../../../server/data_sources"

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: true, result: null })
    }

    const coordinator = await getDatabase()
    const vodInfo = await coordinator.getVod()
    await coordinator.teardown()

    if (vodInfo) {
        res.status(200).json({
            info: {
                link: `https://www.youtube.com/watch?v=${vodInfo.video_link}`,
                title: vodInfo.title,
                thumbnail: vodInfo.thumbnail,
            },
            uploadDate: vodInfo.uploaded_date
        })
    } else {
        res.status(503).json({
            error: "NO_VIDEO_FOUND",
        })
    }

    return
}