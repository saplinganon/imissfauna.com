import Head from "next/head"
import Link from "next/link"
import { useContext, useState } from "react"
import useSWR, { useSWRConfig } from "swr"
import { API_EPOCH, API_ROUTES, STREAM_STATUS } from "../common/enums"
import { CommonFooter, CommonMetadata } from "../components/page_meta"
import { PastStreamCounter } from "../components/past_stream_counter"
import { VideoBox } from '../components/video_box'
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { LangContext, useLocalizationForRootComponentsOnly } from "../lang/dict_manager"
import styles from '../styles/Home.module.css'

function selectRandomImage(fromSet) {
    return fromSet[(Math.random() * fromSet.length) | 0]
}

/**
 * Returns the next image in an imageset, wrapping around to the start after reaching the end of the array.
 */
function selectNextImage(fromSet, currentImage) {
    let nextIndex = fromSet.indexOf(currentImage) + 1
    return fromSet[nextIndex % fromSet.length]
}

function imageFromStreamStatus(status) {
    if (status != STREAM_STATUS.LIVE && status != STREAM_STATUS.STARTING_SOON) {
        return selectRandomImage(NO_STREAM_IMAGE_SET)
    } else {
        return selectRandomImage(HAVE_STREAM_IMAGE_SET)
    }
}

/**
 * Returns an imageset with its positions in the array scrambled.
 */
function scrambledImageSet(state) {
    let shuffle = function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1))
            let temp = array[i]
            array[i] = array[j]
            array[j] = temp
        }
        return array
    }
    if (state.isError) {
        return shuffle([...ERROR_IMAGE_SET])
    }
    switch (state.status) {
        case STREAM_STATUS.LIVE:
        case STREAM_STATUS.STARTING_SOON:
            return shuffle([...HAVE_STREAM_IMAGE_SET])
        case STREAM_STATUS.OFFLINE:
        case STREAM_STATUS.INDETERMINATE:
            return shuffle([...NO_STREAM_IMAGE_SET])

    }
}

// This function is now pretty confusing with all the extra data sources
// so here's a chart to try and explain how it works. Time proceeds
// downwards. The stream info API does something similar, but waits
// for the Twitter update to finish before sending a response. 
//
//                              +---------------+ 
// Still valid------------------+Get cached data| 
//      |                       |from DB        | 
//      |                       +-------+-------+ 
//      |                               |         
//      |                             Stale?      
//      |     +------------+            |         
//      |   +-+ Revalidate |<--Members?-+         
//      |   | | against YT |            |         
//      |   | | API        |            |         
//      |   | ++-----------+            v         
//      |   |  |                +---------------+ 
//      |   |  |    Dead/       |Check YouTube  | 
//      |   |  +----finished--->|/live endpoint | 
//      |   |                   +-------+--+----+                      +--------------------+
//      |   |                           |  |                           |Search Twitter      |
//      |   |                           |  +--No stream--------------> |for members streams |
//      |   |                           v                              |/premieres          |
//      |   |                   +---------------+                      +---------+----------+
//      +---+------------------>|Send response  |                                |
//                              |to client      |                                |
//                              +---------------+                                |
//                                                                               |
//                              +---------------+                                |
//                              |First refresh  |<-------------------------------+
//                              |by client JS   |
//                              +---------------+
//
export async function getServerSideProps({ req, res, query }) {
    const ds = await import("../server/data_sources")
    const coordinator = await ds.getDatabase()

    if (process.env.USE_DUMMY_DATA !== "true") {
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }

    const absolutePrefix = process.env.PUBLIC_HOST
    const channelURLEnd = (process.env.WATCH_CHANNEL_HANDLE !== undefined)
        ? process.env.WATCH_CHANNEL_HANDLE
        : `channel/${process.env.WATCH_CHANNEL_ID}`
    const channelLink = `https://www.youtube.com/${channelURLEnd}`

    let staleOnArrival = false
    let useStreamInfo = await ds.getKnownStreamData(coordinator)
    
    if (!useStreamInfo) {
        const { result, error } = await ds.getLiveStreamData(query.mock)
        if (error) {
            console.warn("livestream poll returned error:", error)
            await coordinator.teardown()
            return { props: { 
                showDebugBar: (process.env.USE_DUMMY_DATA === "true"),
                absolutePrefix,
                channelLink, 
                dynamic: { isError: true, initialImage: selectRandomImage(ERROR_IMAGE_SET) } 
            } }
        }

        if (result.videoLink) {
            await coordinator.updateCache([result])
            await coordinator.teardown()
        } else {
            ds.findExtraStreams(coordinator)
                .then(() => console.log("extra task done"))
                .then(() => coordinator.teardown())
            // Instruct the client to refresh after the extended check is done (hopefully).
            // Depending on latency this might need adjustment
            staleOnArrival = true
        }

        useStreamInfo = result
    } else {
        await coordinator.teardown()
    }

    return { props: {
        showDebugBar: (process.env.USE_DUMMY_DATA === "true"),
        staleOnArrival,
        absolutePrefix,
        channelLink,
        dynamic: {
            initialImage: imageFromStreamStatus(useStreamInfo.live),
            usedImageSet: null, //set in Home.componentDidMount
            status: useStreamInfo.live,
            isError: false,
            streamInfo: {
                link: useStreamInfo.videoLink,
                title: useStreamInfo.title,
                startTime: useStreamInfo.streamStartTime?.getTime?.() || null,
                thumbnail: useStreamInfo.thumbnail,
                isMembersOnly: useStreamInfo.isMembersOnly,
                streamType: useStreamInfo.streamType,
            }
        }
    } }
}

function isStreamInfoValid(streamInfo) {
    return !!(streamInfo?.link)
}

function createEmbedDescription(lang, status, streamInfo) {
    if (!isStreamInfoValid(streamInfo)) {
        return ""
    }

    switch (status) {
        case STREAM_STATUS.LIVE:
            return lang.formatString(lang.Main.Embed.TextLive, streamInfo.title)
        case STREAM_STATUS.STARTING_SOON:
            return lang.formatString(lang.Main.Embed.TextStartingSoon, streamInfo.title)
        default:
            return lang.formatString(lang.Main.Embed.TextStreamQueued, streamInfo.title)
    }
}

function StreamInfo(props) {
    const lang = useContext(LangContext)
    if (isStreamInfoValid(props.info)) {
        let text, boxExtraClass = ""
        switch (props.status) {
            case STREAM_STATUS.LIVE:
                text = lang.VideoBox.StatusLive
                boxExtraClass = styles.streamInfoLive
                break
            case STREAM_STATUS.STARTING_SOON:
                text = lang.VideoBox.StatusStartingSoon
                break
            default:
                text = lang.VideoBox.StatusStreamQueued
                break
        }

        return <div className={`${styles.streamInfo} ${boxExtraClass}`}>
            <VideoBox caption={text} info={props.info} showCountdown={props.status != STREAM_STATUS.LIVE} />
        </div>
    } else {
        return <div className={styles.streamInfo}>
            <div className={styles.vstack}>
                <p className={styles.videoBoxCaption}>{lang.VideoBox.NoStreamDummyStatus}</p>
                <p><b>{lang.VideoBox.NoStreamDummyTitle}</b></p>
            </div>
        </div>
    }
}

function LiveOrStartingSoonLayout(props) {
    const lang = useContext(LangContext)
    const [image, setImage] = useState(props.initialImage)
    let pastStreamCounter = null
    let pageEmoji = "🔴"
    if (props.status !== STREAM_STATUS.LIVE) {
        pastStreamCounter = <PastStreamCounter />
    }

    if (props.status !== STREAM_STATUS.LIVE) {
        pageEmoji = "🕒"
    }

    return <div>
        <Head>
            <title>{pageEmoji} {lang.Main.PageTitle}</title>
            <meta content={createEmbedDescription(lang, props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>

        <h1>{lang.Main.DontMissCaption}</h1>
        <StreamInfo status={props.status} info={props.streamInfo} />
        <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt={lang.Main.ImageAlt}  
            onClick={() => setImage(selectNextImage(props.usedImageSet, image))} />
        {pastStreamCounter}
        <CommonFooter channelLink={props.channelLink} />
    </div>
}

function NoStreamLayout(props) {
    const lang = useContext(LangContext)
    const [image, setImage] = useState(props.initialImage)

    return <div>
        <Head>
            <title>{lang.Main.PageTitle}</title>
            <meta content={createEmbedDescription(lang, props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>

        <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt={lang.Main.ImageAlt} 
            onClick={() => setImage(selectNextImage(props.usedImageSet, image))} />
        <StreamInfo status={props.status} info={props.streamInfo} />
        <PastStreamCounter />
        <p><Link href="/reps">{lang.Main.RandomVodLink}</Link></p>
        <CommonFooter channelLink={props.channelLink} />
    </div>
}

function ErrorLayout(props) {
    const lang = useContext(LangContext)
    const [image, setImage] = useState(props.initialImage)

    return <div>
        <Head>
            <title>{lang.Main.PageTitle}</title>
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>
        <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt={lang.Main.ImageAlt} 
            onClick={() => setImage(selectNextImage(props.usedImageSet, image))} />
        <div className={`${styles.streamInfo} ${styles.streamInfoError}`}>
            <p>{lang.formatString(lang.Main.ErrorOccurred, 
                <a href={props.channelLink}>{lang.Main.ErrorMessageChannelLink}</a>)}</p>
        </div>
        <PastStreamCounter />
        <p><Link href="/reps">{lang.Main.RandomVodLink}</Link></p>
        <CommonFooter channelLink={props.channelLink} />
    </div>
}

function DebugBar(props) {
    return <div>
        Set API result flavor:
        <button onClick={() => { props.setQueryString("?mock=live") }}>Live</button>
        <button onClick={() => { props.setQueryString("?mock=soon") }}>Soon</button>
        <button onClick={() => { props.setQueryString("?mock=farout") }}>Early Frame</button>
        <button onClick={() => { props.setQueryString("?mock=nostream") }}>No Stream</button>
        <button onClick={() => { props.setQueryString("?mock=error") }}>Error</button>
        <button onClick={() => { props.mutate(API_ROUTES.STREAM_INFO) }}>(Refresh Now)</button>
    </div>
}

async function refreshStreamInfo(url, debug) {
    const response = await fetch(url + debug)
    const json = await response.json()
    
    if (json.error) {
        throw new Error("API error.")
    }

    if (window && json.serverVersion > API_EPOCH) {
        console.warn("Reloading page because server API epoch changed.")
        window.location.reload()
    }

    return json.result
}

export default function Home(props) {
    const [debugMockType, setDebugMockType] = useState("")
    const [isStaleOnArrival, setStaleOnArrival] = useState(props.staleOnArrival)

    const { mutate } = useSWRConfig()
    const { data } = useSWR(API_ROUTES.STREAM_INFO, (url) => refreshStreamInfo(url, debugMockType), {
        fallbackData: {
            status: props.dynamic.status,
            streamInfo: props.dynamic.streamInfo,
        },
        revalidateOnFocus: false,
        revalidateOnMount: false,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
        refreshInterval: 90000,
    })

    if (isStaleOnArrival) {
        setTimeout(() => mutate(API_ROUTES.STREAM_INFO), 5000)
        setStaleOnArrival(false)
    }

    const [statusBase, setStatusBase] = useState(() => ({
        status: data.status,
        initialImage: props.dynamic.initialImage,
        usedImageSet: scrambledImageSet(data)
    }))

    let effectiveStatusBase = statusBase
    if (data.status !== statusBase.status) {
        const nextSB = {
            status: data.status,
            initialImage: imageFromStreamStatus(data.status),
            usedImageSet: scrambledImageSet(data)
        }
        setStatusBase(nextSB)
        mutate(API_ROUTES.PAST_STREAM_INFO)
        effectiveStatusBase = nextSB
    }

    const layoutCommonProps = {
        absolutePrefix: props.absolutePrefix,
        channelLink: props.channelLink,
        streamInfo: data.streamInfo,
        ...effectiveStatusBase
    }

    let layout
    if (props.dynamic.isError || data.status === undefined) {
        layout = <ErrorLayout {...layoutCommonProps} />
    } else {
        switch (data.status) {
            case STREAM_STATUS.LIVE:
            case STREAM_STATUS.STARTING_SOON:
                layout = <LiveOrStartingSoonLayout {...layoutCommonProps} />
                break
            case STREAM_STATUS.OFFLINE:
            case STREAM_STATUS.INDETERMINATE:
                layout = <NoStreamLayout {...layoutCommonProps} />
                break
        }
    }

    if (!layout) throw "Layout not set."

    return <LangContext.Provider value={useLocalizationForRootComponentsOnly()}>
        <div className={styles.site}>
            <CommonMetadata />
            {layout}
            {props.showDebugBar ? <DebugBar mutate={mutate} setQueryString={setDebugMockType} /> : null}
        </div>
    </LangContext.Provider>
}
