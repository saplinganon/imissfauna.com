import Head from "next/head"
import Script from "next/script"
import React, { useContext } from "react"
import { LangContext } from "../lang/dict_manager"

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
    const lang = useContext(LangContext)
    return <>
        <Head>
            <meta name="viewport" content="initial-scale=1.0, width=device-width" />
            <meta name="theme-color" content="#c3f0ce" />
            <meta content={lang.CommonMetadata.HeaderSMTitle} property="og:title" />
            <meta name="twitter:card" content="summary_large_image" />
        </Head>
        {process.env.NEXT_PUBLIC_GA_TAG ? <GATag tag={process.env.NEXT_PUBLIC_GA_TAG} /> : null}
    </>
}

export function CommonFooter(props) {
    const lang = useContext(LangContext)
    return <footer>
        <a href={props.channelLink}>{lang.CommonMetadata.FooterStreamerLink}</a> <br />
        <small>
            {lang.formatString(
                lang.CommonMetadata.FooterText,
                <a href="https://github.com/saplinganon/imissfauna.com">{lang.CommonMetadata.FooterSourceLink}</a>
            )}
        </small>
    </footer>
}
