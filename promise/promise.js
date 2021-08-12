const PENDING = 'pending',
      FULFILLED = 'fulfilled',
      REJECTED = 'rejected'

const resolvePromise = (promise2, x, resolve, reject) => {
    let called
    if (promise2 === x) {
        return reject(new TypeError('Chaining cycle detected for promise #<Promise>'))
    }

    if ((typeof x === 'object' && x !== null)
        || typeof x === 'function')
    {
        try {
            let then = x.then
            if (typeof then === 'function') {
                then.call(x,
                    y => {
                        if (called) return
                        called = true
                        resolvePromise(promise2, y, resolve, reject)
                    },
                    r => {
                        if (called) return
                        called = true
                        reject(r)
                    })
            } else {
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true
            reject(e)
        }
    } else {
        resolve(x)
    }
}

class Promise {
    constructor(executor) {
        this.state = PENDING
        this.value = void 0
        this.reason = void 0
        this.onFulfilledCallbacks = []
        this.onRejectedCallbacks = []

        const resolve = value => {
            if (this.state === PENDING) {
                this.state = FULFILLED
                this.value = value
                this.onFulfilledCallbacks.forEach(fn => fn()) // publish
            }
        }

        const reject = reason => {
            if (this.state === PENDING) {
                this.state = REJECTED
                this.reason = reason
                this.onRejectedCallbacks.forEach(fn => fn())
            }
        }

        try {
            executor(resolve, reject)
        } catch (e) {
            reject(e)
        }
    }

    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
        onRejected = typeof onRejected === 'function' ? onRejected : error => { throw error }
        // then must return a promise
        let promise2 = new Promise((resolve, reject) => {
            if (this.state === FULFILLED) {
                // onFulfilled or onRejected must not be called
                // in the execution context stack
                setTimeout(() => {
                    // catch the error of promise2
                    try {
                        let x = onFulfilled(this.value)
                        // If either onFulfilled or onRejected returns a value x, 
                        // run the Promise Resolution Procedure [[Resolve]](promise2, x).
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
    
            if (this.state === REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason)
                        resolvePromise(promise2, x, resolve, reject)
                    } catch (e) {
                        reject(e)
                    }
                }, 0)
            }
    
            if (this.state === PENDING) {
                // then may be called multiple times on the same promise.
                // subscribe
                this.onFulfilledCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason)
                            resolvePromise(promise2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0)
                })
            }
        })
        return promise2
    }

    catch(onRejected) {
        return this.then(null, onRejected)
    }

    static resolve(value) {
        if (value instanceof Promise ||
            typeof value === 'object' && value !== null ||
            typeof value === 'function')
        {
            return new Promise((resolve, reject) => value.then(resolve, reject))
        } else {
            return new Promise((resolve, reject) => resolve(value))
        }
    }

    static reject(reason) {
        return new Promise((resolve, reject) => reject(reason))
    }

    static all(promises) {
        const result = []
        let count = 0
        return new Promise((resolve, reject) => {
            for (let i = 0; i < promises.length; i ++) {
                Promise.resolve(promises[i]).then(res => {
                        result[i] = res
                        if (++ count === promises.length) {
                            resolve(result)
                        }
                    }, reject)
            }
        })
    }

    static race(promises) {
        return new Promise((resolve, reject) => {
            for (let p of promises) {
                Promise.resolve(p).then(resolve, reject)
            }
        })
    }

    static allSettled(promises) {
        return new Promise((resolve, reject) => {
            const result = []
            let count = 0
            for (let i = 0; i < promises.length; i ++) {
                Promise.resolve(promises[i]).then(res => {
                        count ++
                        result[i] = { status: 'fulfilled', value: res }
                        if (count === promises.length) {
                            resolve(result)
                        }
                    }, reason => {
                        count ++
                        result[i] = { status: 'rejected', value: reason }
                        if (count === promises.length) {
                            resolve(result)
                        }
                    })
            }
            
        })
    }

    finally(callback) {
        return this.then(value => {
            return Promise.resolve(callback()).then(_ => {
                return value
            })
        }, reason => {
            return Promise.reject(callback()).then(_ => {
                throw new Error(reason)
            })
        })
    }
}

Promise.defer = Promise.deferred = function() {
    let def = {};
    def.promise = new Promise(function(resolve, reject) {
        def.resolve = resolve;
        def.reject = reject;
    });

    return def;
}

module.exports = Promise
