import TicketService from "../src/pairtest/TicketService.js";
import TicketTypeRequest from "../src/pairtest/lib/TicketTypeRequest.js";
import TicketPaymentService from "../src/thirdparty/paymentgateway/TicketPaymentService.js";
import SeatReservationService from "../src/thirdparty/seatbooking/SeatReservationService.js";
import { jest } from '@jest/globals'

describe('TicketService test suite', () => {
    const accountId = 1
    const invalidAccountId = 'a'
    let ts
    beforeEach(() => {
        ts = new TicketService()
    })
    describe('TicketTypes', () => {

        test('purchaseTickets should return the cost and seats required.', () => {

            expect(ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 2),
                new TicketTypeRequest('CHILD', 3),
            ])).toStrictEqual({ "accountId": accountId, "cost": 95, "seats": 5 })
            expect(ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 1),
                new TicketTypeRequest('INFANT', 1)
            ])).toStrictEqual({ "accountId": accountId, "cost": 25, "seats": 1 })
            expect(ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 2),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 1)
            ])).toStrictEqual({ "accountId": accountId, "cost": 65, "seats": 3 })
            expect(ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 10),
                new TicketTypeRequest('CHILD', 3),
                new TicketTypeRequest('INFANT', 4)
            ])).toStrictEqual({ "accountId": accountId, "cost": 295, "seats": 13 })
        })

        test('purchaseTickets should throw error when type is not: Infant, Child and Adult tickets.', () => {
            expect(() => ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('LT', 2),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 1)
            ])).toThrow(TypeError)
        })
    })

    describe('TicketPaymentService', () => {
        const makePaymentSpy = jest.spyOn(TicketPaymentService.prototype, 'makePayment')
        test('TicketService calculates cost correctly', () => {
            expect(ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 2),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 1)
            ]).cost).toStrictEqual(65)
            expect(makePaymentSpy).toHaveBeenCalledWith(1, 65)
        })

        test('TicketService handles TicketPaymentService type error for invalid accountId', () => {
            const invalidAccountId = 'a'
            expect(() => ts.purchaseTickets(invalidAccountId, ...[
                new TicketTypeRequest('ADULT', 2),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 1)
            ])).toThrow('Invalid purchase exception: accountId must be an integer')
        })

        test('TicketService handles TicketPaymentService type error for invalid noOfTickets', () => {

            expect(() => ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', '2'),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 1)
            ])).toThrow('noOfTickets must be an integer')
        })

        describe('SeatReservationService', () => {
            const reserveSeatSpy = jest.spyOn(SeatReservationService.prototype, 'reserveSeat')
            test('TicketService calculates resevations correctly', () => {
                const seats = 3
                expect(ts.purchaseTickets(accountId, ...[
                    new TicketTypeRequest('ADULT', 2),
                    new TicketTypeRequest('CHILD', 2),
                    new TicketTypeRequest('INFANT', 1)
                ]).seats).toBe(4)
                expect(reserveSeatSpy).toHaveBeenCalledWith(1, seats)
            })

            test('TicketService handles SeatReservationService type error for invalid accountId', () => {

                expect(() => ts.purchaseTickets(invalidAccountId, ...[
                    new TicketTypeRequest('ADULT', 2),
                    new TicketTypeRequest('CHILD', 1),
                    new TicketTypeRequest('INFANT', 1)
                ])).toThrow(('Invalid purchase exception: accountId must be an integer'))
            })

            test('TicketService handles SeatReservationService type error for invalid totalSeatsToAllocate', () => {

                jest.spyOn(SeatReservationService.prototype, 'reserveSeat')
                    .mockImplementationOnce(() => { throw new TypeError('totalSeatsToAllocate must be an integer') })
                expect(() => ts.purchaseTickets(accountId, ...[
                    new TicketTypeRequest('ADULT', 2),
                    new TicketTypeRequest('CHILD', 1),
                    new TicketTypeRequest('INFANT', 1)
                ])).toThrow('Invalid purchase exception: totalSeatsToAllocate must be an integer')
            })
        })

        describe('Infant/Child rules', () => {
            test('child and infant tickets cannot be purchased withough an adult', () => {
                expect(() => ts.purchaseTickets(accountId, ...[
                    new TicketTypeRequest('ADULT', 0),
                    new TicketTypeRequest('CHILD', 1),
                    new TicketTypeRequest('INFANT', 1)
                ])).toThrow('Invalid purchase exception: child and infant tickets cannot be purchased without an adult')
            })

            test('infants do not affect price or seat reservation', () => {
                expect(ts.purchaseTickets(accountId, ...[
                    new TicketTypeRequest('ADULT', 1),
                    new TicketTypeRequest('INFANT', 1)
                ])).toStrictEqual({ "accountId": accountId, "cost": 25, "seats": 1 })
            })
        })

        test('unable to buy more than than 25 tickets', () => {
            expect(() => ts.purchaseTickets(accountId, ...[
                new TicketTypeRequest('ADULT', 25),
                new TicketTypeRequest('CHILD', 15),
                new TicketTypeRequest('INFANT', 2)
            ])).toThrow('Invalid purchase exception: cannot purchase more than 25 tickets')
        })

        test('accountId must be greater than zero', () => {
            expect(() => ts.purchaseTickets(0, ...[
                new TicketTypeRequest('ADULT', 2),
                new TicketTypeRequest('CHILD', 1),
                new TicketTypeRequest('INFANT', 2)
            ])).toThrow('Invalid purchase exception: invalid accountId - must be greater than 0')
        })

        test('TicketTypeRequest objects are immutable', () => {
            const ticketTypeRequest = new TicketTypeRequest('ADULT', 1)
            delete ticketTypeRequest.type
            // delete ticketTypeRequest
            console.log(ticketTypeRequest)
            expect(ticketTypeRequest).toStrictEqual(new TicketTypeRequest('ADULT', 1))
        })
    })
})
