import styles from '../styles/Home.module.css'
import Head from "next/head"
import Link from "next/link"
import React from "react"
import { CommonMetadata, CommonFooter } from "../components/page_meta"
import useSWR from 'swr'

export async function getServerSideProps({ req, res, query }) {
    const ds = await import("../server/data_sources")
    const coordinator = await ds.getDatabase()
    
    const vodInfo = await coordinator.getVod()
    await coordinator.teardown()
    
    if (vodInfo) {
        return {
            props: {
                vod: {
                    videoURL: `https://www.youtube.com/watch?v=${vodInfo.video_link}`,
                    title: vodInfo.title,
                    thumbnailURL: vodInfo.thumbnail,
                    uploadDate: vodInfo.uploaded_date
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
    const date = new Date(props.vod.uploadDate)

    return <div className={styles.streamInfo}>
        <div className={styles.vstack}>
            <p>
                <a href={props.vod.videoURL}>{props.vod.title}</a>
            </p>
            <p className={`${styles.streamInfoHead} ${styles.countdown}`}>
                Streamed or uploaded on {date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"})}
            </p>
            {props.vod.isMembersOnly ? <p>(for Faunatics only!)</p> : null}
        </div>
        <img src={props.vod.thumbnailURL} alt="thumbnail" width={120} />
    </div>
}

export default function Reps(props) {
    const { data, isValidating, mutate } = useSWR("/api/random_vod", (url) => fetch(url).then(r => r.json()), {
        fallbackData: {vod: props.vod},
        revalidateOnFocus: false,
        revalidateOnMount: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false
    })

    return <div className={styles.site}>
        <CommonMetadata />
        <Head>
            <title>Do your reps!</title>
            <meta content="Get a random Fauna VOD to watch!" property="og:description" />
        </Head>
        <div className={`${styles.site} ${styles.repsPage} ${isValidating? styles.isReloading : ''}`}>
            <p className={styles.bareTextContainer}>
                Watch this one!
            </p>
            <VideoInfo vod={data.vod} />
            <button className={styles.bigButton} onClick={() => mutate()}>
                Reroll
            </button>
              
            <p><Link href="/"><a>Back to stream tracker</a></Link></p>
            <CommonFooter channelLink={props.channelLink} />
        </div>
    </div>
}
