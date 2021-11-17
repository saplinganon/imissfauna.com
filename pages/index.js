import styles from '../styles/Home.module.css'
import Head from "next/head"
import { pollLivestreamStatus } from "../server/livestream_poller"
import { ERROR_IMAGE_SET, HAVE_STREAM_IMAGE_SET, NO_STREAM_IMAGE_SET } from "../imagesets"

function selectRandomImage(fromSet) {
    return fromSet[(Math.random() * fromSet.length) | 0]
}

export async function getServerSideProps({ req, res }) {
    if (process.env.USE_DUMMY_DATA === "true") {
        return { props: {
            isLive: false,
            isError: false,
            videoLink: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
            videoTitle: "Dummy dummy dummy dummy",
        } }
    }

    res.setHeader("Cache-Control", "max-age=0, s-maxage=180, stale-while-revalidate=300")

    const { error, result } = await pollLivestreamStatus(process.env.WATCH_CHANNEL_ID)
    if (error) {
        console.warn("livestream poll returned error:", error)
        return { props: { isLive: false, isError: true } }
    }

    return { props: {
        isLive: result.live,
        isError: false,
        videoLink: result.videoLink,
        videoTitle: result.title,
    } }
}

export default function Home(props) {
    let className, caption, image, bottomInfo
    const channelLink = `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`

    if (props.isLive) {
        className = "comfy" 
        caption = "I Don't Miss Fauna"
        image = selectRandomImage(HAVE_STREAM_IMAGE_SET)
        bottomInfo = <>
            {"Current Stream: "}
            <a href={props.videoLink}><b>{props.videoTitle}</b></a>
        </>
    } else if (props.isError) {
        className = "error"
        caption = "MEOW!"
        image = selectRandomImage(ERROR_IMAGE_SET)
        bottomInfo = <>
            {"There was a problem checking stream status. "}
            <a href={channelLink}>You can check Fauna&apos;s channel yourself</a>!
        </>
    } else {
        className = "miss-her"
        caption = ""
        image = selectRandomImage(NO_STREAM_IMAGE_SET)
        bottomInfo = <>
            {"Current Stream: "}
            <b>NOTHING UUUUUUUuuuuu</b> 
            {" "}
            <small>(maybe there&apos;s a member stream...)</small>
        </>
    }

    return <div className={styles.site}>
        <Head>
            <title>I MISS FAUNA</title>
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        </Head>

        <div className={className}>
            <h1>{caption}</h1>
            <img src={image} alt="wah" />

            <div className="stream-info">
                <p>{bottomInfo}</p>
            </div>

            <footer>
                <a href={channelLink}>Ceres Fauna Ch. hololive-EN</a> <br />
                <small>
                    Not affiliated with Fauna or hololive - <a href="https://github.com/saplinganon/imissfauna.com">Source</a>
                </small>
            </footer>
        </div>
    </div>
}
