import Head from "next/head"
import Script from "next/script"
import React from "react"

function GATag(props) {
    return <>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${props.tag}`} strategy="afterInteractive"></Script>
        <Script id="google-analytics" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${props.tag}');
        `}</Script>
    </>
}

export function CommonMetadata() {
    return <>
        <Head>
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#c3f0ce" />
            <meta content="I MISS FAUNA" property="og:title" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        {process.env.NEXT_PUBLIC_GA_TAG ? <GATag tag={process.env.NEXT_PUBLIC_GA_TAG} /> : null}
    </>
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
