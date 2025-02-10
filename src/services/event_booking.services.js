const { eventRepository } = require("../repositories");
const axios = require("axios");
const { utils } = require("common-utils");
const { generateOrderId } = utils;
const { generateOrderNumber } = generateOrderId;
const { config } = require("common-utils");
const { envConfig } = config;
const { PAYMENT_BASE_URL } = envConfig;

class EventBookingService {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }

  async checkOfferValid({ eventId, ticketDetails }) {
    return await this.eventRepository.checkOfferValid({
      eventId,
      ticketDetails,
    });
  }

  async checkTicketAvailable({ eventId, totalTicketsRequested }) {
    return await this.eventRepository.checkTicketAvailable({
      eventId,
      totalTicketsRequested,
    });
  }
  async processBooking({ userId, eventInfo }) {
    const { bookingDate, userDetails, eventDetails, ticketDetails } = eventInfo;
    const { eventId } = eventDetails;

    const event = await this.eventRepository.getEventById(eventId);
    const totalAmount = await this.calculateTotalAmount(ticketDetails, event);
    const totalTicketsRequested = ticketDetails.reduce(
      (acc, ticket) => acc + ticket.quantity,
      0
    );

    const ticketAvailable = await this.checkTicketAvailable({
      eventId,
      totalTicketsRequested,
    });
    if (!ticketAvailable) {
      throw new Error("Ticket Quantity Requested Not Available");
    }

    const discount = await this.checkOfferValid({
      eventId,
      ticketDetails,
    });

    const discountedAmount = totalAmount - discount;
    //ORD Prefix stands for OrderNumber
    const orderNumber = await generateOrderNumber("ORD");
    const paymentResponse = await this.initiatePayment(
      orderNumber,
      discountedAmount
    );

    const paymentData = paymentResponse.data;

    const orderId = generateOrderNumber("BKG");
    const bookingPayload = {
      orderId: orderId,
      orderNumber,
      userDetails,
      eventDetails,
      ticketDetails,
      bookingDetails: {
        bookingDate,
        numberOfTickets: totalTicketsRequested,
        ticketPrice: totalAmount,
        offerDiscountAmount: discount,
        totalPrice: discountedAmount,
      },
      paymentDetails: {
        razorpayOrderId: paymentData.data.id,
        razorpayPaymentId: "",
        paymentStatus: "pending",
        transactionType: "event",
      },
    };

    // Store booking in the database
    await this.eventRepository.createBooking(bookingPayload);
    paymentData.data.orderId = orderId;
    return { paymentData };
  }
  async calculateTotalAmount(ticketDetails, event) {
    return ticketDetails.reduce((total, userTicket) => {
      const matchingTicket = event.tickets.find(
        (dbTicket) => dbTicket.categoryName === userTicket.categoryName
      );
      if (!matchingTicket) {
        throw new Error(
          `Ticket category ${userTicket.categoryName} not found in the event`
        );
      }
      return total + matchingTicket.price * userTicket.quantity;
    }, 0);
  }

  async initiatePayment(orderNumber, amount) {
    const paymentData = {
      amount: amount,
      receipt: orderNumber,
      currency: "INR",
    };

    return await axios.post(
      `${PAYMENT_BASE_URL}/initiate-payment`,
      paymentData
    );
  }

  async verifyPayment({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  }) {
    const response = await axios.post(`${PAYMENT_BASE_URL}/validate-payment`, {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    //mock data
    // const response = {
    //   data: false,
    // };
    return response.data;
  }

  async updateBookingAfterPayment(orderId) {
    const bookingRecord =
      await this.eventRepository.getBookingByOrderId(orderId);

    if (!bookingRecord) {
      throw new NotFoundError({ message: "Booking record not found" });
    }

    const updatedEventBookdata = await this.eventRepository.updatePaymentStatus(
      orderId,
      "completed"
    );

    const { eventDetails, ticketDetails } = updatedEventBookdata;
    const eventId = eventDetails.eventId;

    const eventData = await this.eventRepository.getEventById(eventId);
    if (!eventData) {
      throw new NotFoundError({ message: "Event data not found" });
    }

    const plainEventData = eventData.toObject();

    // Update ticket quantities
    const updatedTickets = plainEventData.tickets.map((eventTicket) => {
      const matchingTicket = ticketDetails.find(
        (userTicket) => userTicket.categoryName === eventTicket.categoryName
      );

      if (matchingTicket) {
        return {
          categoryName: eventTicket.categoryName,
          audienceCapacity: eventTicket.audienceCapacity,
          price: eventTicket.price,
          ticketsSold:
            (eventTicket.ticketsSold || 0) + (matchingTicket.quantity || 0),
          _id: eventTicket._id,
        };
      }

      return {
        categoryName: eventTicket.categoryName,
        audienceCapacity: eventTicket.audienceCapacity,
        price: eventTicket.price,
        ticketsSold: eventTicket.ticketsSold || 0,
        _id: eventTicket._id,
      };
    });

    // Update total tickets sold
    const totalTicketsSold =
      plainEventData.totalTicketsSold +
      ticketDetails.reduce((acc, ticket) => acc + ticket.quantity, 0);

    // updated ticket data
    const updateData = {
      tickets: updatedTickets,
      totalTicketsSold,
    };

    // Update the event collection
    const updatedEvent = await this.eventRepository.updateEvent({
      eventId,
      updateData,
    });

    if (!updatedEvent) {
      throw new Error("Failed to update event data");
    }

    return updatedEventBookdata;
  }
}

module.exports = new EventBookingService(eventRepository);
