import React, { useContext } from "react"
import { LangContext, useDictionary } from "../lang/dict_manager"
import styles from "../styles/Home.module.css"
import { TextCountdown } from "./text_countdown"

export function VideoBox(props) {
    const lang = useContext(LangContext)
    const dict = useDictionary()

    return <div className={`${styles.videoBox}`}>
        <div className={styles.vstack}>
            {props.caption?
                <p className={`${styles.videoBoxCaption}`}>
                    {props.caption} {" "}
                    {(props.showCountdown && props.info.startTime)? 
                        <span className={styles.countdown}><TextCountdown to={props.info.startTime} formatStrings={dict.Countdowns.VideoBox} /></span>
                        : null
                    }
                </p>
                : null
            }
            <p><a href={props.info.link}>{props.info.title}</a></p>
            {props.info.isMembersOnly ? <p>{lang.VideoBox.MembersOnlySubtext}</p> : null}
        </div>
        {props.info.thumbnail ? <img src={props.info.thumbnail} alt={lang.VideoBox.ThumbnailAltText} width={120} /> : null}
    </div>
}