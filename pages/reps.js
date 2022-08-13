import styles from '../styles/Home.module.css'
import Head from "next/head"
import Link from "next/link"
import React from "react"
import { CommonMetadata, CommonFooter } from "../components/page_meta"
import useSWR from 'swr'
import { VideoBox } from '../components/video_box'

export async function getServerSideProps({ req, res, query }) {
    const ds = await import("../server/data_sources")
    const coordinator = await ds.getDatabase()
    
    const vodInfo = await coordinator.getVod()
    await coordinator.teardown()
    
    if (vodInfo) {
        return {
            props: {
                info: {
                    link: `https://www.youtube.com/watch?v=${vodInfo.video_link}`,
                    title: vodInfo.title,
                    thumbnail: vodInfo.thumbnail
                },
                uploadDate: vodInfo.uploaded_date,
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

function VodInfo(props) {
    const date = new Date(props.uploadDate)
    const caption = `Streamed or uploaded on ${date.toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"})}`

    return <div className={styles.streamInfo}>
        <VideoBox info={props.info} caption={caption} />
    </div>
}

export default function Reps(props) {
    const { data, isValidating, mutate } = useSWR("/api/v2/random_vod", (url) => fetch(url).then(r => r.json()), {
        fallbackData: {info: props.info, uploadDate: props.uploadDate, error: props.error},
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
            {data.error
                ? <div className={`${styles.streamInfo} ${styles.streamInfoError}`}>
                    <p>A problem occurred while getting a random video: {data.error}</p>
                </div> 
                : <VodInfo info={data.info} uploadDate={data.uploadDate} />}
            <button className={styles.bigButton} onClick={() => mutate()}>
                Reroll
            </button>
              
            <p><Link href="/"><a>Back to stream tracker</a></Link></p>
            <CommonFooter channelLink={props.channelLink} />
        </div>
    </div>
}
