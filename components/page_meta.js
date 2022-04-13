import React from "react"
import Head from "next/head"

export function CommonMetadata() {
    return <Head>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta name="theme-color" content="#c3f0ce" />
        <meta content="I MISS FAUNA" property="og:title" />
        <meta name="twitter:card" content="summary_large_image" />
    </Head>
}

export function CommonFooter(props) {
    return <footer>
        <a href={props.channelLink}>Ceres Fauna Ch. hololive-EN</a> <br />
        <small>
            Not affiliated with Fauna or hololive - Past stream data
            provided by Holodex - <a href="https://github.com/saplinganon/imissfauna.com">Source</a>
        </small>
    </footer>
}
