import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';
import SeatReservationService from '../thirdparty/seatbooking/SeatReservationService.js';
import TicketPaymentService from '../thirdparty/paymentgateway/TicketPaymentService.js';

export default class TicketService {
  /**
   * Should only have private methods other than the one below.
   */

  #requests = []

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
    switch (true) {
      case seats <= 25:
        return seats
      default:
        throw new Error('cannot purchase more than 25 tickets')
    }
  }

  #adultPresent = (...ticketTypeRequests) => {
    let adultPresent
    for (const t of ticketTypeRequests) {
      if (t.type === 'ADULT' && t.noOfTickets > 0 ) adultPresent = true
    }
    return adultPresent
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    try {
      if (!this.#adultPresent(...ticketTypeRequests)) {
        console.log('HERE')
        throw new Error('child and infant tickets cannot be purchased without an adult')
      }
      const pay = new TicketPaymentService()
      const seat = new SeatReservationService()
      ticketTypeRequests.forEach((req) => this.#requests.push(Object.freeze(new TicketTypeRequest(req.type, req.noOfTickets))))
      const totalAmountToPay = this.#cost(...this.#requests)
      const numberOfSeats = this.#seats(...this.#requests)
      pay.makePayment(accountId, totalAmountToPay)
      seat.reserveSeat(accountId, numberOfSeats)
      this.#requests = []
      return {
        seats: numberOfSeats,
        cost: totalAmountToPay
      }
    } catch (error) {
      throw new InvalidPurchaseException(error)
    }
  }
}
