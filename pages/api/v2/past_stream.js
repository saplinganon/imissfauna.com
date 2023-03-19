import { API_EPOCH } from "../../../common/enums"
import { getPastStream } from "../../../server/data_sources"

export default async function handler(req, res) {
    const pastStream = await getPastStream()
    return res.status(200).json({ result: pastStream, serverVersion: API_EPOCH })
}
