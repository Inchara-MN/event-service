const { models } = require("common-utils");
const { Event, EventBooking } = models;

class EventRepository {
  async createEvent({ userId, eventData }) {
    try {
      const newEvent = await Event.create({
        ...eventData,
        userId,
      });
      return newEvent;
    } catch (error) {
      console.error("Error creating event:", error.message);
      throw new Error("Could not create the event. " + error.message);
    }
  }
  async getAllEvents({ filters, sortField, sortOrder, page, limit }) {
    const query = {};

    if (filters.eventTime) {
      const { startDate, endDate } = filters.eventTime;
      if (startDate && endDate) {
        query.startAt = {
          $gte: new Date(startDate),
          $lt: new Date(endDate),
        };
      } else if (startDate) {
        query.startAt = { $gte: new Date(startDate) };
      } else if (endDate) {
        query.startAt = { $lt: new Date(endDate) };
      }
    }

    if (filters.eventType && filters.eventType !== "all") {
      query.isOnline = filters.eventType === "online";
    }

    if (filters.eventPrice) {
      const { min, max } = filters.eventPrice;
      query["tickets"] = {
        $elemMatch: {
          price: { $gte: min || 0, $lte: max || Infinity },
        },
      };
    }

    const sortQuery = {};
    if (sortField === "price") {
      sortQuery["tickets.price"] = sortOrder;
    } else {
      sortQuery[sortField] = sortOrder;
    }

    const skip = (page - 1) * limit;

    // Fetch events with sorting
    const events = await Event.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit);

    const totalEvents = await Event.countDocuments(query);

    return {
      totalEvents,
      page,
      limit,
      events,
    };
  }
  async getEventById(eventId) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error("Event not found");
      }
      return event;
    } catch (error) {
      throw new Error("Could not fetch event. " + error.message);
    }
  }
  async deleteEvent({ userId, eventId }) {
    try {
      const deletedEvent = await Event.findOneAndDelete({
        _id: eventId,
        userId,
      });
      if (!deletedEvent) {
        throw new Error(
          "Event not found or you are not authorized to delete this event"
        );
      }

      return deletedEvent;
    } catch (error) {
      console.error("Error deleting event:", error.message);
      throw new Error("Could not delete the event. " + error.message);
    }
  }
  async updateEvent({ eventId, updateData }) {
    try {
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      return updatedEvent;
    } catch (error) {
      throw new Error("Could not update the event. " + error.message);
    }
  }
  async isDifferenceWithin24Hours(eventId) {
    const eventData = await this.getEventById(eventId);
    const dbDateISO = eventData.startAt;

    const currentTimeMs = Date.now();
    const dbDateMs = new Date(dbDateISO).getTime();

    const timeDiffHours = Math.abs(currentTimeMs - dbDateMs) / (1000 * 60 * 60);

    return timeDiffHours <= 24;
  }

  async isEventExists({ userId, eventId }) {
    try {
      const event = await Event.findOne({ _id: eventId, userId });
      return event !== null;
    } catch (error) {
      throw new Error("Error checking if event exists.");
    }
  }
  async updateEventPublishStatus({ eventId, newPublishStatus }) {
    try {
      const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        { $set: { publishStatus: newPublishStatus } },
        { new: true, runValidators: true }
      );
      if (!updatedEvent) {
        throw new Error("Event not found with the provided eventId.");
      }
      return updatedEvent;
    } catch (error) {
      throw new Error(
        "Could not update the event publish status. " + error.message
      );
    }
  }
  async checkOfferValid({ eventId, ticketDetails }) {
    try {
      const event = await this.getEventById(eventId);

      if (!event || !event.offers) {
        console.log("No Offer present for this event.");
        return 0;
      }

      const { quantity: offerQuantity, percentage: offerPercentage } =
        event.offers;

      if (!offerQuantity || !offerPercentage) {
        console.log("Incomplete offer details.");
        return 0;
      }

      const ticketsSold = event.totalTicketsSold || 0;
      let eligibleOfferTickets = Math.max(0, offerQuantity - ticketsSold);

      if (eligibleOfferTickets <= 0) {
        console.log("No tickets left for the offer.");
        return 0;
      }

      let totalDiscount = 0;

      for (const userTicket of ticketDetails) {
        const dbTicket = event.tickets.find(
          (dbTicket) => dbTicket.categoryName === userTicket.categoryName
        );

        if (!dbTicket) {
          throw new Error(
            `Ticket category ${userTicket.categoryName} not found in the event.`
          );
        }

        const price = dbTicket.price;
        const ticketsEligibleForDiscount = Math.min(
          userTicket.quantity,
          eligibleOfferTickets
        );

        if (ticketsEligibleForDiscount > 0) {
          const ticketDiscount =
            (ticketsEligibleForDiscount * price * offerPercentage) / 100;

          totalDiscount += ticketDiscount;

          // Decrease the count of eligible offer tickets
          eligibleOfferTickets -= ticketsEligibleForDiscount;
        }
      }

      console.log("Total discount amount:", totalDiscount);

      return totalDiscount;
    } catch (error) {
      console.error("Error in checkOfferValid:", error.message);
      throw new Error("Could not calculate the offer discount.");
    }
  }

  async checkTicketAvailable({ eventId, totalTicketsRequested }) {
    const event = await this.getEventById(eventId);

    if (event.totalTicketsSold + totalTicketsRequested > event.totalTickets) {
      return false;
    }
    return true;
  }
  async createBooking(bookingData) {
    try {
      const newBooking = await EventBooking.create(bookingData);
    } catch (error) {
      throw new Error("Could not create the Booking. " + error.message);
    }
  }
  async getBookingByOrderId(orderId) {
    return EventBooking.findOne({ orderId });
  }

  async updatePaymentStatus(orderId, status) {
    const updatedBooking = await EventBooking.findOneAndUpdate(
      { orderId },
      { $set: { "paymentDetails.paymentStatus": status } },
      { new: true }
    );
    return updatedBooking;
  }
}

module.exports = new EventRepository();
