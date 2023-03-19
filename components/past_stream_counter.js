import React from "react"
import useSWR from "swr"
import { useDictionary } from "../lang/dict_manager"
import styles from "../styles/Home.module.css"
import { TextCountdown } from "./text_countdown"

async function fetchPastStream(url) {
    const response = await fetch(url)
    const apiJSON = await response.json()
    
    return {
        link: apiJSON.result.videoLink,
        title: apiJSON.result.title, 
        date: new Date(apiJSON.result.endActual) 
    }
}

export function PastStreamCounter(props) {
    const { data } = useSWR("/api/v2/past_stream", fetchPastStream, {
        revalidateOnFocus: false,
        revalidateOnMount: true,
        revalidateOnReconnect: false,
        revalidateIfStale: true,
        refreshInterval: 90000,
    })
    const dict = useDictionary()

    if (!data) {
        return null
    }

    return <div className={`${styles.streamInfo} ${styles.pastStreamInfo}`}>
        <a href={data?.link}>
            <TextCountdown to={data?.date} formatStrings={dict.Countdowns.PastStream} />
        </a>
    </div>
}
