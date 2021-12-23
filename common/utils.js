import fetch from "node-fetch";
import { AbortController } from "node-abort-controller";

// 5s for server, 30s for client
function _defaultTimeout() {
    if (typeof window === "undefined") {
        return 5000
    }

    return 30000
}

export async function fetchWithTimeout(url, options, timeout, tag) {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeout || _defaultTimeout())
    try {
        console.debug("[fetchWithTimeout]", tag || "", "enter")
        const res = await fetch(url, { ...options, signal: abortController.signal })
        return res
    } catch (e) {
        throw e
    } finally {
        console.debug("[fetchWithTimeout]", tag || "", "exit")
    }
}
