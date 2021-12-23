import { STREAM_STATUS, STREAM_TYPE } from "../common/enums"
import { fetchWithTimeout } from "../common/utils"

async function getTweets(forUser, afterTweetID) {
    console.debug("[getTweets]", "called with args:", { forUser, afterTweetID })
    if (process.env.USE_DUMMY_DATA === "true") {
        return { error: null, result: require("./twitter_api_mock_response.json") }
    }

    let url = `https://api.twitter.com/2/users/${forUser}/tweets?exclude=retweets&tweet.fields=id,text,author_id,entities&max_results=100`
    if (afterTweetID !== undefined) {
        url += `&since_id=${afterTweetID}`
    }

    try {
        const res = await fetchWithTimeout(url, {
            headers: { "Authorization": `Bearer ${process.env.TWITTER_BEARER_TOKEN}` }
        }, undefined, "Get Tweets")
        if (res.status !== 200) {
            return { error: `HTTP status: ${res.status}`, result: null }
        }
        const twitterData = await res.json()
        return { error: null, result: twitterData }
    } catch (e) {
        console.error("[getTweets]", "fetch error:", e)
        return { error: e.toString(), result: null }
    }
}

const YT_REGEXP = /youtu\.be\/(.{11})|www.youtube.com\/watch\?v=(.{11})/
function extractVideoID(url) {
    if (!url) {
        return null
    }

    const res = YT_REGEXP.exec(url)
    if (res) {
        return res[1] || res[2] || null
    }
    return null
}

async function findCandidateURLs(tweets) {
    return tweets.map((tweet) =>
        tweet.entities?.urls?.map?.((ent) => extractVideoID(ent.expanded_url))
    ).flat().filter((v) => !!v)
}

async function loadAndExtractVideoIDs(forUser, afterTweetID) {
    const { result, error } = await getTweets(forUser, afterTweetID)
    if (!error) {
        if (!result.data) {
            return { result: { ids: [], latestTweet: afterTweetID }, error: null }
        }

        const videos = await findCandidateURLs(result.data)
        console.debug("[loadAndExtractVideoIDs]", "return list", videos)
        return { result: { ids: videos, latestTweet: result.meta.newest_id }, error: null }
    }

    return { error, result: null }
}

// ----------------------------------------------

async function queryMultiVideoInfo(videoIDs) {
    if (process.env.USE_DUMMY_DATA === "true") {
        return { error: null, result: require("./youtube_api_mock_response.json").items }
    }

    const apiKey = process.env.YOUTUBE_API_KEY
    const idList = videoIDs.join(",")

    try {
        const res = await fetchWithTimeout(
            `https://youtube.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails,status&id=${idList}&key=${apiKey}`, {
            headers: {
                "Accept": "application/json",
            },
        }, undefined, "Get YouTube Video Info")
        if (res.status !== 200) {
            try {
                const errorDetail = await res.json()
                return { error: errorDetail, result: null }
            } catch {
                return { error: `HTTP status: ${res.status}`, result: null }
            }   
        }
        const data = await res.json()
        return { error: null, result: data.items }
    } catch (e) {
        console.error("[queryMultiVideoInfo]", "fetch error:", e)
        return { error: e.toString(), result: null }
    }
}

function chooseThumbnail(thumbList) {
    for (const [_, thumb] of Object.entries(thumbList)) {
        if (thumb.width > 300 && thumb.height > 150) {
            return thumb.url
        }
    }
    
    return null
}

const ISO8601_DURATION = /^P(?:([0-9]+)Y)?(?:([0-9]+)M)?(?:([0-9]+)W)?(?:([0-9]+)D)?(?:T(?:([0-9]+)H)?(?:([0-9]+)M)?(?:([0-9]+)S)?)?/
function parseISO8601Duration(s) {
    const match = ISO8601_DURATION.exec(s)
    if (!match) {
        return NaN
    }

    const groupToSecs = [0, 31536000, 2592000, 604800, 86400, 3600, 60, 1]
    let time = 0
    for (let i = 1; i < groupToSecs.length; ++i) {
        if (match[i] !== undefined) {
            time += groupToSecs[i] * parseInt(match[i])
        }
    }

    return time * 1000
}

async function extractStreamInfo(videoResponseList, onlyForChannel) {
    return videoResponseList.map((item) => {
        console.debug("[extractStreamInfo]", "considering video", item.snippet.title)
        let start
        if (!(start = item.liveStreamingDetails?.scheduledStartTime) || item.snippet.channelId !== onlyForChannel) {
            console.debug("[extractStreamInfo]", "returning null because video is on wrong channel or has no start time")
            return null
        }

        let info = {
            live: null,
            title: item.snippet.title,
            thumbnail: chooseThumbnail(item.snippet.thumbnails),
            videoLink: `https://www.youtube.com/watch?v=${item.id}`,
            streamStartTime: null,
            isMembersOnly: false,
            streamType: STREAM_TYPE.LIVE_STREAM,
        }

        // Not sure if these are correct, but this data doesn't seem to be provided elsewhere
        if (parseISO8601Duration(item.contentDetails.duration) > 0) {
            info.streamType = STREAM_TYPE.PREMIERE
        }

        if (item.status.privacyStatus === "unlisted") {
            info.isMembersOnly = true
        }

        const startMS = Date.parse(start)
        info.streamStartTime = new Date(startMS)
        if (item.snippet.liveBroadcastContent === "upcoming") {
            const waitTimeLeftMS = startMS - (new Date().getTime())
            if (waitTimeLeftMS > 1800 * 1000) {
                info.live = STREAM_STATUS.OFFLINE
            } else {
                info.live = STREAM_STATUS.STARTING_SOON
            }
        } else if (item.snippet.liveBroadcastContent === "live") {
            info.live = STREAM_STATUS.LIVE
        } else {
            info.live = STREAM_STATUS.OFFLINE
            info.streamType = STREAM_TYPE.DEAD
        }

        return info
    }).filter(v => v !== null)
}

export async function getStreamInfos(videoIDs, filterChannelID) {
    const { result, error } = await queryMultiVideoInfo(videoIDs)
    if (!error) {
        const videos = await extractStreamInfo(result, filterChannelID)
        return { result: videos, error: null }
    }

    return { error, result: null }
}

// ----------------------------------------------

export async function findLinksFromTwitter(fromUser, fromChannel, afterTweetID) {
    let { WATCH_TWITTER_ID, YOUTUBE_API_KEY, TWITTER_BEARER_TOKEN } = process.env
    if (!WATCH_TWITTER_ID || !YOUTUBE_API_KEY || !TWITTER_BEARER_TOKEN) {
        return { error: "Some required environment variables are not set.", result: null }
    }

    const { error: tError, result: tResult } = await loadAndExtractVideoIDs(fromUser, afterTweetID)
    if (tError) {
        return { error: tError, result: null }
    }

    if (tResult.ids.length > 0) {
        const { error: yError, result: yResult } = await getStreamInfos(tResult.ids, fromChannel)
        if (yError) {
            return { error: yError, result: null }
        }
        return { error: null, result: { streams: yResult, latestTweet: tResult.latestTweet } }
    } else {
        return { error: null, result: { streams: [], latestTweet: tResult.latestTweet } }
    }
}
