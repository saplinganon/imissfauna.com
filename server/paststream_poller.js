import { fetchWithTimeout } from "../common/utils"

function createPollRoute(channelID) {
    return `https://holodex.net/api/v2/channels/${channelID}/videos?lang=en&type=stream%2Cplaceholder&include=live_info&limit=24&offset=0&paginated=true`
}

async function fetchPaststreamPage(channelID) {
    try {
        const res = await fetchWithTimeout(createPollRoute(channelID), {
            headers: {
                "X-APIKEY": process.env.HOLODEX_API_KEY
            }
        }, undefined, "Get Holodex Stream Info")
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        const youtubeJSON = await res.json()
        return { error: null, result: youtubeJSON }
    } catch (e) {
        return { error: e.toString(), result: null }
    }
}

function extractPaststreamInfo(fromPageContent) {
    const lastStream = fromPageContent.items.find(e => {
        return e.status === 'past' &&
            e.type === 'stream' &&
            e.topic_id !== 'shorts' &&
            e.duration >= 600 && 
            e.end_actual
    }) || null
    return lastStream ? {
        // Whitelisting the fields to make frontend debugging easier
        videoLink: `https://www.youtube.com/watch?v=${lastStream.id}`,
        title: lastStream.title,
        endActual: Date.parse(lastStream.end_actual)
    } : null
}

export async function pollPaststreamStatus(channelID) {
    if (process.env.USE_DUMMY_DATA === "true") {
        return pollPaststreamStatusDummy(process.env.WATCH_CHANNEL_ID)
	}

    const { error, result: youtubeJSON } = await fetchPaststreamPage(channelID)
    if (error) {
        return { error, result: null }
    }

    return {
        error: null,
        result: extractPaststreamInfo(youtubeJSON)
    }
}

async function pollPaststreamStatusDummy(unused) {
    const dummyData = require("./paststream_dummy_data.json")
    return {
        error: null,
        result: extractPaststreamInfo(dummyData)
    }
}
