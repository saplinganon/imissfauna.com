import styles from '../styles/Home.module.css'
import Head from "next/head"
import Link from "next/link"
import { Component, useState } from "react"
import { CommonMetadata, CommonFooter } from "../components/page_meta"

export async function getServerSideProps({ req, res, query }) {
    const ds = await import("../server/data_sources")
    const coordinator = await ds.getDatabase()
    
    const vodInfo = await coordinator.getVod()
    await coordinator.teardown()
    
    if (vodInfo) {
        return {
            props: {
                vod: {
                    "videoURL": `https://www.youtube.com/watch?v=${vodInfo.video_link}`,
                    "title": vodInfo.title,
                    "thumbnailURL": vodInfo.thumbnail
                },
                channelLink: `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`
            }
        }
    } else {
        res.statusCode = 503
        return {
            props: {
                error: "No video found.",
                channelLink: `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`
            }
        }
    }
}

function VideoInfo(props) {
    return <div className={styles.streamInfo}>
        <div className={styles.vstack}>
            <p>
                <a href={props.vod.videoURL}>{props.vod.title}</a>
            </p>
            {props.vod.isMembersOnly ? <p>(for Faunatics only!)</p> : null}
        </div>
        <img src={props.vod.thumbnailURL} alt="thumbnail" width={120} />
    </div>
}

export default function Reps(props) {
    const [reloading, setReloading] = useState(false)

    return <div className={styles.site}>
        <CommonMetadata />
        <Head>
            <title>Do your reps!</title>
            <meta content="Get a random Fauna VOD to watch!" property="og:description" />
        </Head>
        <div className={`${styles.site} ${styles.repsPage} ${reloading? styles.isReloading : ''}`}>
            <p className={styles.bareTextContainer}>
                Try this:
            </p>
            <VideoInfo vod={props.vod} />
            <Link href="/reps">
                <a className={styles.bigButton} onClick={() => setReloading(true)}>
                    Give me another
                </a>
            </Link>
              
            <p><Link href="/"><a>Back to stream tracker</a></Link></p>
            <CommonFooter channelLink={props.channelLink} />
        </div>
    </div>
}
