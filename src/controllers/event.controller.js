const {
  eventService,
  categoryService,
  eventBookingService,
} = require("../services");
const { utils } = require("common-utils");
const { errorUtils } = utils;

const {
  NotFoundError,
  ValidationError,
  ActionNotAllowedError,
  PaymentFailedError,
} = errorUtils;

class EventController {
  constructor(eventService, categoryService, eventBookingService) {
    this.eventService = eventService;
    this.categoryService = categoryService;
    this.eventBookingService = eventBookingService;
  }

  async createEvent(req, res, next) {
    try {
      const { body: eventData, userId } = req;

      if (!eventData) {
        return res.sendError(
          new ValidationError({
            message: "Event data is required.",
          })
        );
      }

      const { title, category, isOnline, platformDetails, venueDetails } =
        eventData;

      if (!category || !title || isOnline === null || isOnline === undefined) {
        const missingAttributes = [];

        if (!title) missingAttributes.push("title");
        if (!category) missingAttributes.push("category");
        if (isOnline === null || isOnline === undefined)
          missingAttributes.push("isOnline");

        return res.sendError(
          new ValidationError({
            message: `Missing required attributes: ${missingAttributes.join(", ")}`,
          })
        );
      }
      if (isOnline && !platformDetails) {
        return res.sendError(
          new ValidationError({
            message: "Platform details are required for online events.",
          })
        );
      }

      if (!isOnline && !venueDetails) {
        return res.sendError(
          new ValidationError({
            message: "Venue details are required for in-person events.",
          })
        );
      }
      const validCategoryCodes =
        await this.categoryService.validateCategoryCodes({
          userId,
          categoriesToValidate: eventData.category,
        });

      if (!validCategoryCodes) {
        return res.sendError(
          new NotFoundError({
            message: "Category not added by the user.",
          })
        );
      }
      const newEvent = await this.eventService.createEvent({
        userId,
        eventData,
      });

      return res.sendSuccess({
        message: "Event created successfully",
        data: newEvent,
      });
    } catch (error) {
      console.error("Error creating event:", error.message);
      next(error);
    }
  }
  async getAllEvents(req, res, next) {
    try {
      const filters = {
        eventTime: req.query.eventTime ? JSON.parse(req.query.eventTime) : null,
        eventType: req.query.eventType || null,
        eventPrice: req.query.eventPrice
          ? JSON.parse(req.query.eventPrice)
          : null,
        status: req.query.status || "upcoming",
      };
      const sortField = req.query.sortField || "startAt";
      const sortOrder = parseInt(req.query.sortOrder, 10) || 1;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      if (req.query.keyword) {
        let query = req.query.keyword;
        query = decodeURIComponent(query);

        const { events, total } = await this.eventService.searchEvents({
          query,
          page,
          limit,
        });

        const meta = {
          page,
          total,
          length: events.length,
        };

        return res.sendSuccess({
          message: "Events fetched successfully",
          data: events,
          meta,
        });
      }

      const { events, total } = await this.eventService.getAllEvents({
        filters,
        sortField,
        sortOrder,
        page,
        limit,
      });

      const meta = {
        page,
        total,
        length: events.length,
      };
      return res.sendSuccess({
        message: "Events fetched successfully",
        data: events,
        meta,
      });
    } catch (error) {
      console.error("Error in EventController:", error.message);
      next(error);
    }
  }

  async getEventById(req, res, next) {
    try {
      const { eventId } = req.params;

      if (!eventId) {
        return res.sendError(
          new ValidationError({
            message: "Event ID is required.",
          })
        );
      }

      const event = await this.eventService.getEventById(eventId);

      if (!event) {
        return res.sendError(
          new NotFoundError({
            message: "No Event found",
          })
        );
      }

      return res.sendSuccess({
        message: "Event fetched successfully",
        data: event,
      });
    } catch (error) {
      console.error("Error fetching event by ID:", error.message);

      next(error);
    }
  }
  async deleteEvent(req, res, next) {
    try {
      const { eventId } = req.body;
      const { userId } = req;

      if (!eventId) {
        return res.sendError(
          new ValidationError({
            message: "Event Id is required.",
          })
        );
      }

      const isEventExist = await this.eventService.isEventExists({
        userId,
        eventId,
      });

      if (!isEventExist) {
        return res.sendError(
          new NotFoundError({
            message: "No Event found for this user",
          })
        );
      }
      const notDeletable =
        await this.eventService.isDifferenceWithin24Hours(eventId);

      if (notDeletable) {
        return res.sendError(
          new ActionNotAllowedError({
            message: "Operation not allowed.",
          })
        );
      }
      const deletedEvent = await this.eventService.deleteEvent({
        userId,
        eventId,
      });

      //TODO : Logic for Ticket amount Refund to be added

      return res.sendSuccess({
        message: "Event deleted successfully",
        data: deletedEvent,
      });
    } catch (error) {
      console.error("Error deleting event:", error.message);
      next(error);
    }
  }

  async updateEvent(req, res, next) {
    try {
      const { userId, body } = req;
      const { eventId, ...updateData } = body;

      if (!eventId) {
        return res.sendError(
          new ValidationError({
            message: "Event Id is required",
          })
        );
      }
      const isEventExist = await this.eventService.isEventExists({
        userId,
        eventId,
      });

      if (!isEventExist) {
        return res.sendError(
          new NotFoundError({
            message: "No Event found for this user",
          })
        );
      }
      const isUpdatable =
        await this.eventService.isDifferenceWithin24Hours(eventId);

      if (isUpdatable) {
        return res.sendError(
          new ActionNotAllowedError({
            message: "Operation not allowed.",
          })
        );
      }
      const updatedEvent = await this.eventService.updateEvent({
        eventId,
        updateData,
      });

      return res.sendSuccess({
        message: "Event updated successfully",
        data: updatedEvent,
      });
    } catch (error) {
      next(error);
    }
  }
  async publishEvent(req, res, next) {
    try {
      const { userId, body } = req;
      const { eventId } = body;

      if (!eventId) {
        return res.sendError(
          new ValidationError({
            message: "Event Id is required",
          })
        );
      }
      const isEventExist = await this.eventService.isEventExists({
        userId,
        eventId,
      });

      if (!isEventExist) {
        return res.sendError(
          new NotFoundError({
            message: "No Event found for this user",
          })
        );
      }
      const eventDetails = await this.eventService.getEventById(eventId);
      const eventMissingFields =
        await this.eventService.validateEventDetails(eventDetails);
      if (eventMissingFields.length > 0) {
        return res.sendError(
          new ValidationError({
            message: `The following fields are missing: ${eventMissingFields.join(", ")}`,
          })
        );
      }

      //Update the `publishStatus` of the event to 'published' from draft , as client called /publish API
      const newPublishStatus = "published";
      const updatedEventDetails =
        await this.eventService.updateEventPublishStatus({
          eventId,
          newPublishStatus,
        });

      return res.sendSuccess({
        message: "Event created successfully",
        data: updatedEventDetails,
      });
    } catch (error) {
      next(error);
    }
  }

  //Booking the event
  async bookEvent(req, res, next) {
    try {
      const { userId } = req;
      const eventInfo = req.body;

      const { bookingDate, userDetails, eventDetails, ticketDetails } =
        eventInfo;

      const missingAttributes = [];

      if (!bookingDate) missingAttributes.push("bookingDate");
      if (!userDetails) missingAttributes.push("userDetails");
      if (!eventDetails) missingAttributes.push("eventDetails");
      if (!ticketDetails) missingAttributes.push("ticketDetails");

      if (missingAttributes.length > 0) {
        return res.sendError(
          new ValidationError({
            message: `Required attributes are missing: ${missingAttributes.join(", ")}`,
          })
        );
      }

      const bookingData = await this.eventBookingService.processBooking({
        userId,
        eventInfo,
      });

      const orderCreated = bookingData.paymentData.data;

      return res.sendSuccess({
        message: "Payment order created successfully",
        data: orderCreated,
      });
    } catch (error) {
      next(error);
    }
  }
  //verifying the payment
  async verify(req, res, next) {
    try {
      const paymentInfo = req.body;
      const userId = req.userId;

      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        paymentInfo;

      const missingAttributes = [];

      if (!orderId) missingAttributes.push("orderId");
      if (!razorpayOrderId) missingAttributes.push("razorpayOrderId");
      if (!razorpayPaymentId) missingAttributes.push("razorpayPaymentId");
      if (!razorpaySignature) missingAttributes.push("razorpaySignature");

      if (missingAttributes.length > 0) {
        return res.sendError(
          new ValidationError({
            message: `Required attributes are missing: ${missingAttributes.join(", ")}`,
          })
        );
      }

      const isPaymentValid = await this.eventBookingService.verifyPayment({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      if (!isPaymentValid) {
        return res.sendError(
          new PaymentFailedError({
            message: "Payment Failed",
          })
        );
      }
      const eventBookData =
        //Upadting booking status
        await this.eventBookingService.updateBookingAfterPayment(orderId);

      return res.sendSuccess({
        message: "Event booked successfully!",
        data: eventBookData,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EventController(
  eventService,
  categoryService,
  eventBookingService
);
