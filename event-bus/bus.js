class EventBus {
    constructor(options = {}) {
        this.events = {}
        this.maxListener = options.maxListener || Infinity
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = []
        }

        if (!callback) {
            console.warn(`${event} event is not registered`)
        }

        if (this.maxListener !== Infinity &&
            this.maxListener <= this.events[event].length)
        {
            console.warn(`${event} event over max listener`)
            return
        }

        this.events[event].push(callback)
    }

    emit(event, ...args) {
        this.events[event].forEach(cb => cb.apply(this, args))
    }

    once(event, callback) {
        const fn = () => {
            this.off(event, fn)
            callback.apply(this)
        }
        this.on(event, fn)
    }

    off(event, callback) {
        if (!callback) {
            this.events[event] = []
        } else {
            this.events[event] = this.events[event].filter(cb => cb !== callback)
        }
    }
}
