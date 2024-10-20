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
    return ticketTypeRequests.reduce((accumulator, currentValue) => {
      const type = currentValue.getTicketType()
      const amount = currentValue.getNoOfTickets()
      const seatsRequired = type === 'INFANT' ? 0 : 1
      return accumulator + seatsRequired * amount
    }, 0)
  }

  purchaseTickets(accountId, ...ticketTypeRequests) {
    const pay = new TicketPaymentService()
    const seat = new SeatReservationService()
    try {
      ticketTypeRequests.forEach((req) => this.#requests.push(new TicketTypeRequest(req.type, req.noOfTickets)))
      const totalAmountToPay = this.#cost(...this.#requests)
      const numberOfSeats = this.#seats(...this.#requests)
      pay.makePayment(accountId, totalAmountToPay)
      seat.reserveSeat(accountId, numberOfSeats)
      this.#requests = []
    } catch (error) {
      throw new InvalidPurchaseException(error)
    }
  }
}
