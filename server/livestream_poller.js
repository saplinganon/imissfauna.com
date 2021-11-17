import { parse } from "node-html-parser"

function createPollRoute(channelID) {
    return `https://www.youtube.com/channel/${channelID}/live`
}

function validateVideoLink(anyLink) {
    if (anyLink.match(/watch\?v=/)) {
        return anyLink
    }
}

export async function pollLivestreamStatus(channelID) {
    let youtubeHTML
    try {
        const res = await fetch(createPollRoute(channelID), {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36"
            }
        })
        if (res.status !== 200) {
            return {error: `HTTP status: ${res.status}`, result: null}
        }
        youtubeHTML = await res.text()

        console.warn(res.statusText)
    } catch(e) {
        return {error: e.toString(), result: null}
    }

    const dom = parse(youtubeHTML, {
        blockTextElements: {
            script: false,
            noscript: false,
            style: false,
            pre: false,
        }
    })


    const canonical = dom.querySelector("link[rel='canonical']")
    if (!canonical) {
        return {error: `Malformed HTML`, result: null} 
    }

    const videoLink = validateVideoLink(canonical.getAttribute("href"))
    if (videoLink) {
        const liveTitle = dom.querySelector("meta[name='title']").getAttribute("content")
        return {error: null, result: {live: true, title: liveTitle, videoLink}}
    } 

    return {error: null, result: {live: false, title: null, videoLink: null}}
}
