import { Component } from "react"

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

function evaluateFormat(format, value) {
    if (typeof format === 'function') {
        return format(value)
    }
    return format.replace('%@', value)
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
            return evaluateFormat(this.formats.forPast, cs)
        } else {
            return evaluateFormat(this.formats.forFuture, cs)
        }
    }

    render() {
        const isNow = this.isCloseToNow(this.state.delta), isNegative = this.state.delta < 0, effectiveDelta = Math.abs(this.state.delta)
        if (isNow) {
            return <>{this.formats.immediate}</>
        }

        const days = (effectiveDelta / 86400000) | 0
        const hours = ((effectiveDelta % 86400000) / 3600000) | 0
        const minutes = ((effectiveDelta % 3600000) / 60000) | 0
        const seconds = Math.round((effectiveDelta % 60000) / 1000)

        const components = []
        if (days) components.push(evaluateFormat(this.formats.days, days))
        if (hours) components.push(evaluateFormat(this.formats.hours, hours))
        if (minutes) components.push(evaluateFormat(this.formats.minutes, minutes))
        if (seconds) components.push(evaluateFormat(this.formats.seconds, seconds))

        return <>{this.formattedTime(components, isNegative)}</>
    }
}
