import * as utils from './utils'

export type OptionType = {
    rows: number,
    rowHeight: number,
    value: number,
    adjustTime: number,
    momentumThresholdTime: number
    bounceTime: number
    momentumThresholdDistance: number
    onSelect?: (d: Data | Data[], n: number) => void
}

export type Data = {
    value: number | string,
    disabled?: boolean,
    text: string
} //| string

export type ItemType = { classList: any }

const isTouch = (e: TouchEvent | MouseEvent): e is TouchEvent =>
    !!(e as TouchEvent).touches

export class Wheel {
    container: any
    data: Data[] | Data[][]
    items: ItemType[]
    y: number
    selectedIndex: number
    isTransition: boolean
    isTouching: boolean
    easings: {
        scroll: number | string // easeOutQuint
        scrollBounce: number | string // easeOutQuard
        bounce: number | string // easeOutQuart
    }
    options: Partial<Wheel> & OptionType
    //pointerEvents: { start: string; move: string; end: string; cancel: string }
    transformName: any
    transitionName: any
    transitionendName: any
    wheel: HTMLDivElement
    scroller: HTMLUListElement
    wheelHeight: any
    maxScrollY: number
    startY: number
    lastY: any
    startTime: number
    momentumThresholdTime: number

    constructor(el: Element | string, options: Partial<Wheel & OptionType>) {
        this.container = typeof el === "string" ? document.querySelector(el) : el

        this.data = []
        this.items = []

        this.y = 0
        this.selectedIndex = 0

        this.isTransition = false
        this.isTouching = false

        this.easings = {
            scroll: "cubic-bezier(0.23, 1, 0.32, 1)", // easeOutQuint
            scrollBounce: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", // easeOutQuard
            bounce: "cubic-bezier(0.165, 0.84, 0.44, 1)" // easeOutQuart
        }

        //@ts-ignore
        this.options = utils.extend({
            data: [],
            rows: 5,
            rowHeight: 34,
            adjustTime: 400,
            bounceTime: 600,
            momentumThresholdTime: 300,
            momentumThresholdDistance: 10
        }, options)

        if (this.options.rows % 2 === 0) this.options.rows++

        this.transformName = utils.prefixed("transform")
        this.transitionName = utils.prefixed("transition")
        this.transitionendName = {
            WebkitTransition: "webkitTransitionEnd",
            MozTransition: "transitionEnd",
            msTransition: "MSTransitionEnd",
            OTransition: "oTransitionEnd",
            transition: "transitionend"
        }[this.transitionName]

        this._init()
    }
    _init() {
        this._createDOM()
        this._bindEvents()
    }

    _createDOM() {
        this.wheel = document.createElement("div")
        this.wheel.className = "wheelpicker-wheel"

        this.scroller = document.createElement("ul")
        this.scroller.className = "wheelpicker-wheel-scroller"

        this.setData(this.options.data as any, this.options.value)

        this.wheel.style.height = this.options.rowHeight * this.options.rows + "px"
        this.scroller.style.marginTop = this.options.rowHeight * Math.floor(this.options.rows / 2) + "px"

        this.wheelHeight = this.wheel.offsetHeight

        this.wheel.appendChild(this.scroller)
        this.container.appendChild(this.wheel)
    }

    _momentum(current: number, start: number, time: number, lowerMargin: number, wheelSize: number, deceleration: number, rowHeight: number) {
        let distance = current - start
        let speed = Math.abs(distance) / time
        let destination
        let duration

        deceleration = deceleration === undefined ? 0.0006 : deceleration

        destination = current + (speed * speed) / (2 * deceleration) * (distance < 0 ? -1 : 1)
        duration = speed / deceleration

        destination = Math.round(destination / rowHeight) * rowHeight

        if (destination < lowerMargin) {
            destination = wheelSize ? lowerMargin - (wheelSize / 2.5 * (speed / 8)) : lowerMargin
            distance = Math.abs(destination - current)
            duration = distance / speed
        } else if (destination > 0) {
            destination = wheelSize ? wheelSize / 2.5 * (speed / 8) : 0
            distance = Math.abs(current) + destination
            duration = distance / speed
        }

        return {
            destination: Math.round(destination),
            duration: duration
        }
    }

    _resetPosition(duration: number) {
        let y = this.y

        duration = duration || 0

        if (y > 0) y = 0
        if (y < this.maxScrollY) y = this.maxScrollY

        if (y === this.y) return false

        this._scrollTo(y, duration, this.easings.bounce)

        return true
    }

    _getClosestSelectablePosition(y: number) {
        let index = Math.abs(Math.round(y / this.options.rowHeight))

        //@ts-ignore
        if (!this.data[index]?.disabled) return y

        let max = Math.max(index, this.data.length - index)
        for (let i = 1; i <= max; i++) {
            //@ts-ignore
            if (!this.data[index + i].disabled) {
                index += i
                break
            }
            //@ts-ignore
            if (!this.data[index - i].disabled) {
                index -= i
                break
            }
        }
        return index * -this.options.rowHeight
    }

    _scrollTo(y: number, duration: number, easing: number | string) {
        if (this.y === y) {
            this._scrollFinish()
            return false
        }

        this.y = this._getClosestSelectablePosition(y)
        this.scroller.style[this.transformName] = "translate3d(0," + this.y + "px,0)"

        if (duration && duration > 0) {
            this.isTransition = true
            this.scroller.style[this.transitionName] = duration + "ms " + easing
        } else {
            this._scrollFinish()
        }
    }

    _scrollFinish() {
        let newIndex = Math.abs(this.y / this.options.rowHeight)
        if (this.selectedIndex != newIndex) {
            this.items[this.selectedIndex].classList.remove("wheelpicker-item-selected")
            this.items[newIndex].classList.add("wheelpicker-item-selected")
            this.selectedIndex = newIndex
            if (this.options.onSelect) this.options.onSelect(this.data[newIndex], newIndex)
        }
    }

    _getCurrentY() {
        const matrixValues = utils.getStyle(this.scroller, this.transformName).match(/-?\d+(\.\d+)?/g) as string[]
        return parseInt(matrixValues[matrixValues.length - 1])
    }

    _start = (event: TouchEvent | MouseEvent) => {
        event.preventDefault()

        if (!this.data.length) return

        if (this.isTransition) {
            this.isTransition = false
            this.y = this._getCurrentY()
            this.scroller.style[this.transformName] = "translate3d(0," + this.y + "px,0)"
            this.scroller.style[this.transitionName] = ""
        }

        this.startY = this.y
        this.lastY = isTouch(event) ? event.touches[0].pageY : event.pageY
        this.startTime = Date.now()

        this.isTouching = true
    }

    _move = (event: TouchEvent | MouseEvent) => {
        if (!this.isTouching) return false

        let y = isTouch(event) ? event.changedTouches[0].pageY : event.pageY
        let deltaY = y - this.lastY
        let targetY = this.y + deltaY
        let now = Date.now()

        this.lastY = y

        if (targetY > 0 || targetY < this.maxScrollY) {
            targetY = this.y + deltaY / 3
        }

        this.y = Math.round(targetY)

        this.scroller.style[this.transformName] = "translate3d(0," + this.y + "px,0)"

        if (now - this.startTime > this.momentumThresholdTime) {
            this.startTime = now
            this.startY = this.y
        }

        return false
    }

    _end = (event: MouseEvent | TouchEvent) => {
        if (!this.isTouching) return false

        const deltaTime = Date.now() - this.startTime
        let duration = this.options.adjustTime
        let easing = this.easings.scroll
        const distanceY = Math.abs(this.y - this.startY)
        let momentumVals
        let y

        this.isTouching = false

        if (deltaTime < this.options.momentumThresholdTime && distanceY <= 10 && (event.target as HTMLDivElement)?.classList.contains("wheelpicker-item")) {
            console.log(event.target?.['_wsIdx'], -this.options.rowHeight, duration, easing)
            this._scrollTo(event.target?.['_wsIdx'] * -this.options.rowHeight, duration, easing)
            return false
        }

        if (this._resetPosition(this.options.bounceTime)) return

        if (deltaTime < this.options.momentumThresholdTime && distanceY > this.options.momentumThresholdDistance) {
            momentumVals = this._momentum(this.y, this.startY, deltaTime, this.maxScrollY, this.wheelHeight, 0.0007, this.options.rowHeight)
            y = momentumVals.destination
            duration = momentumVals.duration
        } else {
            y = Math.round(this.y / this.options.rowHeight) * this.options.rowHeight
        }

        if (y > 0 || y < this.maxScrollY) {
            easing = this.easings.scrollBounce
        }

        this._scrollTo(y, duration, easing)
    }

    _transitionEnd() {
        this.isTransition = false
        this.scroller.style[this.transitionName] = ""

        if (!this._resetPosition(this.options.bounceTime)) this._scrollFinish()
    }

    _bindEvents() {
        //including desktop touch screen
        if ("ontouchstart" in window) {
            this.wheel.ontouchstart = this._start
            this.wheel.ontouchmove = this._move
            this.wheel.ontouchend = this._end
            this.wheel.ontouchcancel = this._end
        }

        this.wheel.onmousedown = this._start
        this.wheel.onmousemove = this._move
        this.wheel.onmouseup = this._end
        this.wheel.onmouseleave = this._end

        let mid = 0
        let pid: number
        let pwid: number
        this.wheel.onwheel = event => {
            let duration = this.options.adjustTime
            let easing = this.easings.scroll


            if (!event.target)
                return

            this._scrollTo((pid = ((event.target?.['_wsIdx'] === pwid ? pid : event.target?.['_wsIdx']) + Math.sign(event.deltaY))) * -this.options.rowHeight, duration, easing)

            pwid = event.target?.['_wsIdx']

            if (!(typeof pid === 'undefined' || isNaN(pid)))
                mid = pid
        }

        this.scroller.addEventListener(this.transitionendName, this._transitionEnd.bind(this))

    }

    getData() {
        return this.data
    }

    setData(data: Data[], value?: number) {
        let defaultValue = value || (data && data.length ? (data[0].value || data[0]) : null)

        this.items = []
        this.scroller.innerHTML = ""

        this.data = data.map((item, idx) => {
            let li = document.createElement("li")

            li.className = "wheelpicker-item"

            //@ts-ignore
            item = typeof item === "object" ? item : {
                text: item,
                value: item
            }

            if (item.disabled) li.className += " wheelpicker-item-disabled"
            if (item.value === defaultValue) {
                li.className += " wheelpicker-item-selected"
                this.selectedIndex = idx
            }
            //@ts-ignore
            li._wsIdx = idx
            li.innerHTML = item.text

            this.items.push(li)
            this.scroller.appendChild(li)

            return item
        }, this)

        this.y = this.selectedIndex * -this.options.rowHeight
        this.scroller.style[this.transformName] = "translate3d(0," + this.y + "px,0)"
        this.maxScrollY = -this.options.rowHeight * (this.data.length - 1)
    }

    getSelectedItem() {
        return this.data[this.selectedIndex]
    }

    getValue() {
        let selected = this.getSelectedItem()
        //@ts-ignore
        return selected ? (Array.isArray(selected) ? selected.map(s => s.value) : selected.value) : null
    }

    setValue(value, noAnimation: boolean) {
        let index
        let item

        for (let i = 0, len = this.data.length; i < len; i++) {
            item = this.data[i]

            if (item.value === value) {
                if (!item.disabled) index = i
                break
            }
        }

        if (index >= 0) {
            this._scrollTo(index * -this.options.rowHeight, noAnimation ? 0 : this.options.adjustTime, this.easings.scroll)
        }

        return index
    }
}
