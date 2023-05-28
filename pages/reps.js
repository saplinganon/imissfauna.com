import Head from "next/head"
import Link from "next/link"
import React, { useContext } from "react"
import useSWR from 'swr'
import { API_ROUTES, API_EPOCH } from '../common/enums'
import { CommonFooter, CommonMetadata } from "../components/page_meta"
import { VideoBox } from '../components/video_box'
import { LangContext, useDictionary, useLocalizationForRootComponentsOnly } from "../lang/dict_manager"
import styles from '../styles/Home.module.css'

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
                error: "NO_VIDEO_FOUND",
                channelLink: `https://www.youtube.com/channel/${process.env.WATCH_CHANNEL_ID}`
            }
        }
    }
}

function VodInfo(props) {
    const lang = useContext(LangContext)
    const date = new Date(props.uploadDate)
    const caption = lang.formatString(lang.Reps.VodInfoUploadDate, useDictionary().FormatDateShort(date))

    return <div className={styles.streamInfo}>
        <VideoBox info={props.info} caption={caption} />
    </div>
}

export default function Reps(props) {
    const { data, isValidating, mutate } = useSWR(API_ROUTES.RANDOM_VOD, (url) => fetch(url).then(r => r.json()), {
        fallbackData: {info: props.info, uploadDate: props.uploadDate, error: props.error},
        revalidateOnFocus: false,
        revalidateOnMount: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false
    })
    const lang = useLocalizationForRootComponentsOnly()

    if (typeof window !== "undefined" && data.serverVersion > API_EPOCH) {
        window.location.reload()
    }

    return <LangContext.Provider value={lang}>
        <div className={styles.site}>
            <CommonMetadata />
            <Head>
                <title>{lang.Reps.PageTitle}</title>
                <meta content={lang.Reps.SMMetaDescription} property="og:description" />
            </Head>
            <div className={`${styles.site} ${styles.repsPage} ${isValidating? styles.isReloading : ''}`}>
                <p className={styles.bareTextContainer}>{lang.Reps.PageCaption}</p>
                {data.error
                    ? <div className={`${styles.streamInfo} ${styles.streamInfoError}`}>
                        <p>{lang.formatString(lang.Reps.ErrorDescription, lang.Reps.ErrorCodes[data.error])}</p>
                    </div> 
                    : <VodInfo info={data.info} uploadDate={data.uploadDate} />}
                <button className={styles.bigButton} onClick={() => mutate()}>
                    {lang.Reps.RerollButton}
                </button>
                
                <p><Link href="/">{lang.Reps.BackToStreamTrackerButton}</Link></p>
                <CommonFooter channelLink={props.channelLink} />
            </div>
        </div>
    </LangContext.Provider>
}
