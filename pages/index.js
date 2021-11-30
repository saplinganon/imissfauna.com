import styles from '../styles/Home.module.css'
import Head from "next/head"
import { STREAM_STATUS, pollLivestreamStatus, pollLivestreamStatusDummy } from "../server/livestream_poller"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { useState } from "react"

function selectRandomImage(fromSet, excludingImage) {
    let excludeIndex
    if (excludingImage && (excludeIndex = fromSet.indexOf(excludingImage)) > -1) {
        // This is to prevent the same image from being selected again.
        const nextIndex = (Math.random() * fromSet.length - 1) | 0
        return fromSet[nextIndex >= excludeIndex ? nextIndex + 1 : nextIndex]
    }

    return fromSet[(Math.random() * fromSet.length) | 0]
}

export async function getServerSideProps({ req, res }) {
    let apiVal
    if (process.env.USE_DUMMY_DATA === "true") {
        apiVal = await pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID)
    } else {
        apiVal = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }
    const { result, error } = apiVal

    const absolutePrefix = process.env.PUBLIC_HOST
    const channelLink = `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`

    if (error) {
        console.warn("livestream poll returned error:", error)
        return { props: { isError: true, absolutePrefix, initialImage: selectRandomImage(ERROR_IMAGE_SET), channelLink } }
    }

    let initialImage
    if (result.live != STREAM_STATUS.LIVE && result.live != STREAM_STATUS.STARTING_SOON) {
        initialImage = selectRandomImage(NO_STREAM_IMAGE_SET)
    } else {
        initialImage = selectRandomImage(HAVE_STREAM_IMAGE_SET)
    }

    return { props: {
        absolutePrefix,
        initialImage,
        channelLink,
        status: result.live,
        isError: false,
        streamInfo: {
            link: result.videoLink,
            title: result.title,
            startTime: result.streamStartTime?.getTime() || null,
            currentTime: (new Date()).getTime()
        }
    } }
}

function isStreamInfoValid(streamInfo) {
    return !!(streamInfo.link)
}

function createEmbedDescription(status, streamInfo) {
    if (!isStreamInfoValid(streamInfo)) {
        return ""
    }

    switch (status) {
        case STREAM_STATUS.LIVE:
            return `Streaming: ${streamInfo.title}`
        case STREAM_STATUS.STARTING_SOON:
            return `Starting Soon: ${streamInfo.title}`
        default:
            return `Next Stream: ${streamInfo.title}`
    }
}

function StreamInfo(props) {
    let link, text
    if (isStreamInfoValid(props.info)) {
        switch (props.status) {
            case STREAM_STATUS.LIVE:
                text = <b className={styles.red}>LIVE: </b>
                break
            case STREAM_STATUS.STARTING_SOON:
                text = "Starting Soon: "
                break
            default:
                text = "Next Stream: "
                break
        }

        link = <b><a href={props.info.link}>{props.info.title}</a></b>
    } else {
        text = "Current Stream: "
        link = <><b>NOTHING UUUUUUUuuuuuu</b> <small>(but maybe there&apos;s a member stream...)</small></>
    }

    return <div className="stream-info">
        <p>{text} {link}</p>
    </div>
}

export default function Home(props) {
    let className, caption = "", imageSet, bottomInfo
    const [image, setImage] = useState(props.initialImage)

    if (props.isError) {
        className = "error"
        imageSet = ERROR_IMAGE_SET
        bottomInfo = <div className="stream-info">
            <p>There was a problem checking stream status. <a href={channelLink}>You can check Fauna&apos;s channel yourself</a>!</p>
        </div>
    } else if (props.status != STREAM_STATUS.LIVE && props.status != STREAM_STATUS.STARTING_SOON) {
        className = "miss-her"
        imageSet = NO_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
    } else {
        className = "comfy" 
        caption = "I Don't Miss Fauna"
        imageSet = HAVE_STREAM_IMAGE_SET
        bottomInfo = <StreamInfo status={props.status} info={props.streamInfo} />
    }

    return <div className={styles.site}>
        <Head>
            <title>I MISS FAUNA</title>
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#c3f0ce" />
            <meta content="I MISS FAUNA" property="og:title" />
            <meta content={createEmbedDescription(props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>

        <div className={className}>
            <h1>{caption}</h1>
            <img src={`${props.absolutePrefix}/${image}`} alt="wah" onClick={() => setImage(selectRandomImage(imageSet, image))} />

            {bottomInfo}

            <footer>
                <a href={props.channelLink}>Ceres Fauna Ch. hololive-EN</a> <br />
                <small>
                    Not affiliated with Fauna or hololive - <a href="https://github.com/saplinganon/imissfauna.com">Source</a>
                </small>
            </footer>
        </div>
    </div>
}
