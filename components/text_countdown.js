import { Component } from "react"
import styles from "../styles/Home.module.css"

const DEFAULT_FORMATS = {
    immediate: "now",
    forFuture: "in %@",
    forPast: "%@ ago",
    days: "%@d",
    hours: "%@h",
    minutes: "%@m",
    seconds: "%@s",
    separator: " ",
}

export class TextCountdown extends Component {
    constructor(props) {
        super(props)
        this.state = {delta: props.to - Date.now()}
        this.formats = Object.assign({...DEFAULT_FORMATS}, props.formatStrings)
    }

    componentDidMount() {
        this.timer = setInterval(() => this.setState({delta: this.props.to - Date.now()}), 1000)
    }

    componentWillUnmount() {
        clearInterval(this.timer)
    }

    isCloseToNow(d) {
        return d <= 0 && d > -60000
    }

    formattedTime(components, isDateInPast) {
        const cs = components.join(this.formats.separator)
        if (isDateInPast) {
            return this.formats.forPast.replace("%@", cs)
        } else {
            return this.formats.forFuture.replace("%@", cs)
        }
    }

    render() {
        const isNow = this.isCloseToNow(this.state.delta), isNegative = this.state.delta < 0, effectiveDelta = Math.abs(this.state.delta)
        if (isNow) {
            return <span className={styles.countdown}>{this.formats.immediate}</span>
        }

        const days = (effectiveDelta / 86400000) | 0
        const hours = ((effectiveDelta % 86400000) / 3600000) | 0
        const minutes = ((effectiveDelta % 3600000) / 60000) | 0
        const seconds = Math.round((effectiveDelta % 60000) / 1000)

        const components = []
        if (days) components.push(this.formats.days.replace("%@", days))
        if (hours) components.push(this.formats.hours.replace("%@", hours))
        if (minutes) components.push(this.formats.minutes.replace("%@", minutes))
        if (seconds) components.push(this.formats.seconds.replace("%@", seconds))

        return <span className={styles.countdown}>{this.formattedTime(components, isNegative)}</span> 
    }
}