import { API_EPOCH } from "../../../common/enums"
import { pollHolodexLivestreamStatus } from "../../../server/holodex_poller"

export default async function handler(req, res) {
    const rep = await pollHolodexLivestreamStatus()
    return res.status(200).json({ result: rep, serverVersion: API_EPOCH })
}
