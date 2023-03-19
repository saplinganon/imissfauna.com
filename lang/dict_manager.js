import { useRouter } from "next/router"
import { createContext } from "react"
import LocalizedStrings from "react-localization"
import AllStrings from "./strings"

const dummyEmptyLocalizedStrings = new LocalizedStrings({"a": "aa"})
export const LangContext = createContext(dummyEmptyLocalizedStrings) 

export function useLangCode() {
    const { locale, defaultLocale } = useRouter()
    const resolvedLocale = locale? locale : defaultLocale
    return resolvedLocale
}

export function useDictionary() {
    const langCode = useLangCode()
    return AllStrings[langCode]
}

export function useLocalizationForRootComponentsOnly() {
    const langCode = useLangCode()
    return new LocalizedStrings(AllStrings, {customLanguageInterface: () => langCode})
}
