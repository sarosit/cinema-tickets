import TicketService from "../src/pairtest/TicketService.js";
import InvalidPurchaseException from "../src/pairtest/lib/InvalidPurchaseException.js";
import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest.js";
import TicketPaymentService from "../src/thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../src/thirdparty/seatbooking/SeatReservationService.js";
import { jest } from '@jest/globals'

const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
}

const generateTicketRequests = (types, reqs, max) => {
    let ticketReqs = []
    for (let i = 0; i < reqs; i++) {
        const noOfTickets = getRandomInt(max)
        const type = types[getRandomInt(3)]
        ticketReqs.push(new TicketTypeRequest(type, noOfTickets))
    }
    return ticketReqs
}

const ticketTypeRequests = [
    { type: 'ADULT', noOfTickets: 2 },
    { type: 'CHILD', noOfTickets: 1 },
    { type: 'INFANT', noOfTickets: 1 }
]

describe('different ticket scenarios', () => {
    const ts = new TicketService()
    const accountId = 1

    describe('Types', () => {
        test('purchaseTickets should only accept: Infant, Child and Adult tickets.', () => {
            const ticketTypeRequests = [
                { type: 'ADULT', noOfTickets: 2 },
                { type: 'CHILD', noOfTickets: 1 },
                { type: 'INFANT', noOfTickets: 1 }
            ]

            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toBe(void 0)
        })

        test('purchaseTickets should throw error when type is not: Infant, Child and Adult tickets.', () => {
            const ticketTypeRequests = [
                { type: 'ADULT', noOfTickets: 2 },
                { type: 'CAT', noOfTickets: 1 },
                { type: 'IANT', noOfTickets: 1 }
            ]

            try {
                ts.purchaseTickets(accountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: type must be ADULT, CHILD, or INFANT'))
            }
        })
    })

    describe('TicketPaymentService', () => {
        const makePaymentSpy = jest.spyOn(TicketPaymentService.prototype, 'makePayment').mockImplementation()

        test('TicketService calculates cost correctly', () => {
            const expectedCost = 65
            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toBe(void 0)
            expect(makePaymentSpy).toHaveBeenCalledWith(1, expectedCost)
        })

        test('TicketService handles TicketPaymentService type error for invalid accountId', () => {
            const invalidAccountId = 'a'
            try {
                ts.purchaseTickets(invalidAccountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: accountId must be an integer'))
            }
        })

        test('TicketService handles TicketPaymentService type error for invalid noOfTickets', () => {
            try {
                ts.purchaseTickets(accountId, ...[{ type: 'ADULT', noOfTickets: '2' }])
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: noOfTickets must be an integer'))
            }
        })
    })

    describe('SeatReservationService', () => {
        const reserveSeatSpy = jest.spyOn(SeatReservationService.prototype, 'reserveSeat')
        test('TicketService calculates resevations correctly', () => {
            // makePayment should get called with the correct amount to pay
            const seats = 3
            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toBe(void 0)
            expect(reserveSeatSpy).toHaveBeenCalledWith(1, seats)
        })

        test('TicketService handles SeatReservationService type error for invalid accountId', () => {
            // makePayment should throw error for invalid accoundId
            const invalidAccountId = 'a'
            try {
                ts.purchaseTickets(invalidAccountId, ...ticketTypeRequests)
                expect(makePaymentSpy).toThrow(new TypeError('accountId must be an integer'))
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: accountId must be an integer'))
            }
        })

        test('TicketService handles SeatReservationService type error for invalid totalSeatsToAllocate', () => {

            jest.spyOn(TicketPaymentService.prototype, 'makePayment').mockImplementation()

            try {
                ts.purchaseTickets(accountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: totalSeatsToAllocate must be an integer'))
            }
        })
    })

})