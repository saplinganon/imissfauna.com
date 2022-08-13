import React from "react"
import useSWR from "swr"
import styles from "../styles/Home.module.css"
import { TextCountdown } from "./text_countdown"

const COUNTDOWN_FORMATS = {
    immediate: "", forFuture: "", forPast: `%@ without Fauna`,
    days: (days) => (days > 1 ? `${days} days` : `${days} day`),
    hours: (hours) => (hours > 1 ? `${hours} hours` : `${hours} hour`),
    minutes: (minutes) => (minutes > 1 ? `${minutes} minutes` : `${minutes} minute`),
    seconds: (seconds) => (seconds > 1 ? `${seconds} seconds` : `${seconds} second`),
    separator: ", "
}

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

    if (!data) {
        return null
    }

    return <div className={`${styles.streamInfo} ${styles.pastStreamInfo}`}>
        <a href={data?.link}>
            <TextCountdown to={data?.date} formatStrings={COUNTDOWN_FORMATS} />
        </a>
    </div>
}
