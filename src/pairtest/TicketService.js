import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';
import logger from './logger.js';

export default class TicketService {
  /**
   * Should only have private methods other than the one below.
   */

  #priceMapping = {
    infant: 0,
    child: 15,
    adult: 25,
  }

  #cost = (...ticketTypeRequests) => {
    return ticketTypeRequests.reduce((accumulator, currentValue) => {
      const cost = this.#priceMapping[currentValue.getTicketType().toLowerCase()]
      const amount = currentValue.getNoOfTickets()
      return accumulator + (cost * amount)
    }, 0)
  }

  #seats = (...ticketTypeRequests) => {
    const seats = ticketTypeRequests.reduce((accumulator, currentValue) => {
      const type = currentValue.getTicketType()
      const amount = currentValue.getNoOfTickets()
      const seatsRequired = type === 'INFANT' ? 0 : 1
      return accumulator + seatsRequired * amount
    }, 0)
    if (seats > 25) throw new Error('cannot purchase more than 25 tickets')
    return seats
  }

  #adultPresent = (...ticketTypeRequests) => {
    let adultPresent = false
    for (const t of ticketTypeRequests) {
      if (t.getTicketType() === 'ADULT' && t.getNoOfTickets() > 0) adultPresent = true
    }
    return adultPresent
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    logger.info(`AccountId ${accountId} has made ${ticketTypeRequests.length} ticket requests`)
    try {
      // Check for adult present and account Id < 0
      if (!this.#adultPresent(...ticketTypeRequests)) {
        throw new Error('child and infant tickets cannot be purchased without an adult')
      }
      if (typeof accountId === 'number' && !accountId > 0) {
        throw new Error('invalid accountId - must be greater than 0')
      }
      // Calculate total cost and seats required
      const totalAmountToPay = this.#cost(...ticketTypeRequests)
      const numberOfSeats = this.#seats(...ticketTypeRequests)
      // Call third party services
      const pay = new TicketPaymentService()
      const seat = new SeatReservationService()
      pay.makePayment(accountId, totalAmountToPay)
      seat.reserveSeat(accountId, numberOfSeats)
      // Return a receipt of purchase
      return {
        accountId: accountId,
        seats: numberOfSeats,
        cost: totalAmountToPay
      }
    } catch (error) {
      throw new InvalidPurchaseException(error)
    }
  }
}
