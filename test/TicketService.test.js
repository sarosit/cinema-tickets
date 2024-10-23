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

describe('TicketService test suite', () => {
    const accountId = 1
    let ts
    beforeEach(() => {
        ts = new TicketService()
    })
    // afterEach(() => {
    //     jest.resetAllMocks()
    // })

    describe('TicketTypes', () => {
        const ticketTypeRequests = [
            { type: 'ADULT', noOfTickets: 2 },
            { type: 'CHILD', noOfTickets: 1 },
            { type: 'INFANT', noOfTickets: 1 }
        ]
        test('purchaseTickets should only accept: Infant, Child and Adult tickets.', () => {

            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests))
                .toStrictEqual({ "cost": 65, "seats": 3 })
        })

        test('purchaseTickets should throw error when type is not: Infant, Child and Adult tickets.', () => {
            const ticketTypeRequests_invalid = [
                { type: 'ADULT', noOfTickets: 2 },
                { type: 'CAT', noOfTickets: 1 },
                { type: 'IANT', noOfTickets: 1 }
            ]

            try {
                ts.purchaseTickets(accountId, ...ticketTypeRequests_invalid)
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: type must be ADULT, CHILD, or INFANT'))
            }
        })
    })

    describe('TicketPaymentService', () => {
        const makePaymentSpy = jest.spyOn(TicketPaymentService.prototype, 'makePayment')
        const ticketTypeRequests = [
            { type: 'ADULT', noOfTickets: 2 },
            { type: 'CHILD', noOfTickets: 1 },
            { type: 'INFANT', noOfTickets: 1 }
        ]
        test('TicketService calculates cost correctly', () => {
            // const expectedCost = 65
            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toStrictEqual({ "cost": 65, "seats": 3 })
            expect(makePaymentSpy).toHaveBeenCalledWith(1, 65)
        })

        test('TicketService handles TicketPaymentService type error for invalid accountId', () => {
            const invalidAccountId = 'a'
            try {
                ts.purchaseTickets(invalidAccountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe(('Invalid purchase exception: accountId must be an integer'))
            }
            // expect(ts.purchaseTickets(invalidAccountId, ...ticketTypeRequests)).toStrictEqual('Invalid purchase exception: accountId must be an integer')
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
            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toStrictEqual({ "cost": 65, "seats": 3 })
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

            jest.spyOn(SeatReservationService.prototype, 'reserveSeat')
                .mockImplementationOnce(() => { throw new TypeError('totalSeatsToAllocate must be an integer') })

            try {
                ts.purchaseTickets(accountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe('Invalid purchase exception: totalSeatsToAllocate must be an integer')
            }
        })
    })

    describe('Infant/Child rules', () => {
        test('child and infant tickets cannot be purchased withough an adult', () => {
            const ticketTypeRequests = [
                { type: 'ADULT', noOfTickets: 0 },
                { type: 'CHILD', noOfTickets: 1 },
                { type: 'INFANT', noOfTickets: 1 }
            ]

            try {
                ts.purchaseTickets(accountId, ...ticketTypeRequests)
            } catch (error) {
                expect(error.message).toBe('Invalid purchase exception: child and infant tickets cannot be purchased without an adult')
            }
        })

        test('infants do not affect price or seat reservation', () => {
            const ticketTypeRequests = [
                { type: 'ADULT', noOfTickets: 1 },
                { type: 'INFANT', noOfTickets: 2 }
            ]
            expect(ts.purchaseTickets(accountId, ...ticketTypeRequests)).toStrictEqual({ "cost": 25, "seats": 1 })
        })
    })

    test('unable to buy more than than 25 tickets', () => {
        const ticketTypeRequests = [
            { type: 'ADULT', noOfTickets: 25 },
            { type: 'CHILD', noOfTickets: 25 },
            { type: 'INFANT', noOfTickets: 2 }
        ]
        try {
            ts.purchaseTickets(accountId, ...ticketTypeRequests)
        } catch (error) {
            console.log(error)
            expect(error.message).toBe('Invalid purchase exception: cannot purchase more than 25 tickets')
        }
    })

})