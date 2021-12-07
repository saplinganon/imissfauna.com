import styles from '../styles/Home.module.css'
import Head from "next/head"
import { STREAM_STATUS } from "../common/enums"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"
import { Component, useState } from "react"
import { TextCountdown } from "../components/text_countdown"

function selectRandomImage(fromSet, excludingImage) {
    let excludeIndex
    if (excludingImage && fromSet.length > 1 && (excludeIndex = fromSet.indexOf(excludingImage)) > -1) {
        // This is to prevent the same image from being selected again.
        const nextIndex = (Math.random() * (fromSet.length - 1)) | 0
        return fromSet[nextIndex >= excludeIndex ? nextIndex + 1 : nextIndex]
    }

    return fromSet[(Math.random() * fromSet.length) | 0]
}

function imageFromStreamStatus(status) {
    if (status != STREAM_STATUS.LIVE && status != STREAM_STATUS.STARTING_SOON) {
        return selectRandomImage(NO_STREAM_IMAGE_SET)
    } else {
        return selectRandomImage(HAVE_STREAM_IMAGE_SET)
    }
}

export async function getServerSideProps({ req, res, query }) {
    const sLSP = await import("../server/livestream_poller")
    const sPSP = await import("../server/paststream_poller")

    let apiVal
    if (process.env.USE_DUMMY_DATA === "true") {
        apiVal = await sLSP.pollLivestreamStatusDummy(process.env.WATCH_CHANNEL_ID, query.mock)
    } else {
        apiVal = await sLSP.pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
        res.setHeader("Cache-Control", "max-age=0, s-maxage=90, stale-while-revalidate=180")
    }
    const { result, error } = apiVal

    const absolutePrefix = process.env.PUBLIC_HOST
    const channelLink = `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`

    if (error) {
        console.warn("livestream poll returned error:", error)
        return { props: { isError: true, absolutePrefix, initialImage: selectRandomImage(ERROR_IMAGE_SET), channelLink } }
    }

    const pastStreamVal = await sPSP.pollPaststreamStatus(process.env.WATCH_CHANNEL_ID)
    const { error: pastStreamError, result: pastStreamResult } = pastStreamVal
    if (pastStreamError) {
        console.warn("paststream poll returned error:", pastStreamError)
        // Error is non-blocking. Gracefully fall back to not displaying things related to past stream
    }

    let initialImage
    if (result.live != STREAM_STATUS.LIVE && result.live != STREAM_STATUS.STARTING_SOON) {
        initialImage = selectRandomImage(NO_STREAM_IMAGE_SET)
    } else {
        initialImage = selectRandomImage(HAVE_STREAM_IMAGE_SET)
    }

    return { props: {
        passDown: {
            absolutePrefix,
            channelLink,
        },
        dynamic: {
            initialImage: imageFromStreamStatus(result.live),
            status: result.live,
            isError: false,
            pastStream: pastStreamResult,
            streamInfo: {
                link: result.videoLink,
                title: result.title,
                startTime: result.streamStartTime?.getTime?.() || null,
                thumbnail: result.thumbnail
            }
        }
    } }
}

function isStreamInfoValid(streamInfo) {
    return !!(streamInfo?.link)
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
    let link, text, boxExtraClass = "", thumb
    if (isStreamInfoValid(props.info)) {
        switch (props.status) {
            case STREAM_STATUS.LIVE:
                text = "LIVE"
                boxExtraClass = styles.streamInfoLive
                break
            case STREAM_STATUS.STARTING_SOON:
                text = "Starting Soon"
                break
            default:
                text = "Next Stream"
                break
        }

        link = <a href={props.info.link}>{props.info.title}</a>
        thumb = props.info.thumbnail
    } else {
        text = "Current Stream"
        link = <><b>NOTHING UUUUUUUuuuuuu</b> <small>(but maybe there&apos;s a member stream...)</small></>
    }

    const formats = {
        immediate: "(Now!)",
        forFuture: "(in %@)",
        forPast: "(%@ ago)",
    }

    return <div className={`${styles.streamInfo} ${boxExtraClass}`}>
        <div className={styles.vstack}>
            <p className={`${styles.streamInfoHead}`}>
                {text} {props.status != STREAM_STATUS.LIVE && props.info?.startTime ? 
                    <span className={styles.countdown}><TextCountdown to={props.info.startTime} formatStrings={formats} /></span>
                    : null}
            </p>
            <p>{link}</p>
        </div>
        {thumb ? <img src={thumb} alt="thumbnail" width={120} /> : null}
    </div>
}

function CommonMetadata() {
    return <Head>
        <title>I MISS FAUNA</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="theme-color" content="#c3f0ce" />
        <meta content="I MISS FAUNA" property="og:title" />
        <meta name="twitter:card" content="summary_large_image" />
    </Head>
}

function LiveOrStartingSoonLayout(props) {
    const [image, setImage] = useState(props.initialImage)
    return <div className={styles.site}>
        <CommonMetadata />
        <Head>
            <meta content={createEmbedDescription(props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>

        <div className="comfy">
            <h1>{"I Don't Miss Fauna"}</h1>
            <StreamInfo status={props.status} info={props.streamInfo} />
            <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt="wah" 
                onClick={() => setImage(selectRandomImage(HAVE_STREAM_IMAGE_SET, image))} />
            <CommonFooter channelLink={props.channelLink} actRefreshNow={props.actRefreshNow} />
        </div>
    </div>
}

function NoStreamLayout(props) {
    const [image, setImage] = useState(props.initialImage)
    return <div className={styles.site}>
        <CommonMetadata />
        <Head>
            <meta content={createEmbedDescription(props.status, props.streamInfo)} property="og:description" />
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>

        <div className="miss-her">
            <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt="wah" 
                onClick={() => setImage(selectRandomImage(NO_STREAM_IMAGE_SET, image))} />
            <StreamInfo status={props.status} info={props.streamInfo} />
            {(props.status === STREAM_STATUS.OFFLINE && props.pastStream?.endActual)
                ? <TextCountdown
                    to={props.pastStream.endActual}
                    formatStrings={{
                        immediate: "",
                        forFuture: "",
                        forPast: `%@ without Fauna`,
                        days: (days) => (days > 1 ? `${days} days` : `${days} day`),
                        hours: (hours) => (hours > 1 ? `${hours} hours` : `${hours} hour`),
                        minutes: (minutes) => (minutes > 1 ? `${minutes} minutes` : `${minutes} minute`),
                        seconds: (seconds) => (seconds > 1 ? `${seconds} seconds` : `${seconds} second`),
                    }}
                />
                : null}
            <CommonFooter channelLink={props.channelLink} actRefreshNow={props.actRefreshNow} />
        </div>
    </div>
}

function ErrorLayout(props) {
    const [image, setImage] = useState(props.initialImage)
    return <div className={styles.site}>
        <CommonMetadata />
        <Head>
            <meta content={`${props.absolutePrefix}/${image}`} property="og:image" />
        </Head>

        <div className="error">
            <img className={styles.bigImage} src={`${props.absolutePrefix}/${image}`} alt="wah" 
                onClick={() => setImage(selectRandomImage(ERROR_IMAGE_SET, image))} />
            <div className={`${styles.streamInfo} ${styles.streamInfoError}`}>
                <p>There was a problem checking stream status. <a href={props.channelLink}>{"You can check Fauna's channel yourself"}</a>!</p>
            </div>
            <CommonFooter channelLink={props.channelLink} actRefreshNow={props.actRefreshNow} />
        </div>
    </div>
}

function CommonFooter(props) {
    return <footer>
        <a href={props.channelLink}>Ceres Fauna Ch. hololive-EN</a> <br />
        <small>
            Not affiliated with Fauna or hololive - <a href="https://github.com/saplinganon/imissfauna.com">Source</a>
        </small>
        {false ? <button onClick={props.actRefreshNow}>(Debug: Refresh Now)</button> : null}
    </footer>
}

export default class Home extends Component {
    constructor(props) {
        super(props)
        this.state = {...props.dynamic}
        this.isRequestInFlight = false
        this.actRefreshNow = () => this.refresh()
    }

    componentDidMount() {
        this.timer = setInterval(() => this.refresh(), 90 * 1000)
    }

    componentWillUnmount() {
        clearInterval(this.timer)
    }

    refresh() {
        if (this.isRequestInFlight) {
            console.debug("refresh(): Request already in flight, doing nothing")
            return
        }

        this.isRequestInFlight = true
        fetch("/api/stream_info")
            .then((res) => res.json())
            .then((json) => {
                if (json.error !== false) {
                    throw "API body reported failure"
                }
                return json.result
            })
            .then((jsBody) => {
                if (jsBody.ytStreamData) {
                    const nextState = { isError: false, status: jsBody.ytStreamData.status, streamInfo: jsBody.ytStreamData.streamInfo, initialImage: null }
                    // If the stream status changes, the render layout we use can also change, which will reset the
                    // image to the initialImage. The code here is to make sure the initialImage is correct
                    // for the stream status.
                    // It is set to null above, but this is fine because it will only be looked at on layout changes.
                    if (nextState.status !== this.state.status) {
                        nextState.initialImage = imageFromStreamStatus(nextState.status)
                    }

                    this.setState(nextState)
                }

                if (jsBody.pastStreamData) {
                    this.setState({ pastStream: jsBody.pastStreamData })
                }
            })
            .catch((r) => {
                console.error("Error refreshing:", r)
            })
            .then(() => { 
                console.debug("refresh(): done")
                this.isRequestInFlight = false 
            })
    }

    render() {
        if (this.state.isError) {
            return <ErrorLayout actRefreshNow={this.actRefreshNow} {...this.props.passDown} {...this.state} />
        }

        switch (this.state.status) {
            case STREAM_STATUS.LIVE:
            case STREAM_STATUS.STARTING_SOON:
                return <LiveOrStartingSoonLayout actRefreshNow={this.actRefreshNow} {...this.props.passDown} {...this.state} />
            case STREAM_STATUS.OFFLINE:
            case STREAM_STATUS.INDETERMINATE:
                return <NoStreamLayout actRefreshNow={this.actRefreshNow} {...this.props.passDown} {...this.state} />
        }
    }
}