import React from "react"
import styles from "../styles/Home.module.css"
import { TextCountdown } from "./text_countdown"

const COUNTDOWN_FORMATS = {
    immediate: "(Now!)",
    forFuture: "(in %@)",
    forPast: "(%@ ago)",
}

export function VideoBox(props) {
    return <div className={`${styles.videoBox}`}>
        <div className={styles.vstack}>
            {props.caption?
                <p className={`${styles.videoBoxCaption}`}>
                    {props.caption} {" "}
                    {(props.showCountdown && props.info.startTime)? 
                        <span className={styles.countdown}><TextCountdown to={props.info.startTime} formatStrings={COUNTDOWN_FORMATS} /></span>
                        : null
                    }
                </p>
                : null
            }
            <p><a href={props.info.link}>{props.info.title}</a></p>
            {props.info.isMembersOnly ? <p>(for Faunatics only!)</p> : null}
        </div>
        {props.info.thumbnail ? <img src={props.info.thumbnail} alt="thumbnail" width={120} /> : null}
    </div>
}