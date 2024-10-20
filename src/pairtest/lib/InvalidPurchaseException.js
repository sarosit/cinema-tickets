export default class InvalidPurchaseException extends Error {
    constructor (error) {
        super()
        this.message = `Invalid purchase exception: ${error.message}`
    }
}
