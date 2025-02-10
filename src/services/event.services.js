const { eventRepository } = require("../repositories");
const axios = require("axios");
const { utils } = require("common-utils");
const { generateOrderId } = utils;
const { generateOrderNumber } = generateOrderId;
const { config } = require("common-utils");
const { envConfig } = config;
const { PAYMENT_BASE_URL } = envConfig;
class EventService {
  constructor(eventRepository) {
    this.eventRepository = eventRepository;
  }
  async createEvent({ userId, eventData }) {
    return await this.eventRepository.createEvent({ userId, eventData });
  }
  async getAllEvents({ filters, sortField, sortOrder, page, limit }) {
    const { calculatedPage, calculatedLimit, calculatedOffset } =
      await this.calculateOffset({ page, limit });

    const { events, total } = await this.eventRepository.getAllEvents({
      filters,
      sortField,
      sortOrder,
      calculatedOffset,
      calculatedLimit,
    });

    return { events, total };
  }

  async getEventById(eventId) {
    return await this.eventRepository.getEventById(eventId);
  }
  async deleteEvent({ userId, eventId }) {
    return await this.eventRepository.deleteEvent({ userId, eventId });
  }
  async updateEvent({ eventId, updateData }) {
    return await this.eventRepository.updateEvent({
      eventId,
      updateData,
    });
  }
  async isDifferenceWithin24Hours(eventId) {
    return await this.eventRepository.isDifferenceWithin24Hours(eventId);
  }

  async isEventExists({ userId, eventId }) {
    return await this.eventRepository.isEventExists({ userId, eventId });
  }
  async updateEventPublishStatus({ eventId, newPublishStatus }) {
    return await this.eventRepository.updateEventPublishStatus({
      eventId,
      newPublishStatus,
    });
  }

  async getFilteredEvents(filters, page = 1, limit = 10) {
    return this.eventRepository.findEvents(filters, page, limit);
  }
  async calculateOffset({ page, limit }) {
    const calculatedPage = Math.max(1, parseInt(page) || 1);
    const calculatedLimit = Math.min(Math.max(parseInt(limit) || 10, 5), 20);

    const calculatedOffset = (page - 1) * limit;
    return { calculatedPage, calculatedLimit, calculatedOffset };
  }
  async searchEvents({ query, page, limit }) {
    const { calculatedPage, calculatedLimit, calculatedOffset } =
      await this.calculateOffset({ page, limit });

    const { data: events, total } = await this.eventRepository.searchEvents({
      query,
      calculatedOffset,
      calculatedLimit,
    });
    return { events, total };
  }
  async validateEventDetails(eventDetails) {
    const requiredFields = [
      "title",
      "category",
      "startAt",
      "endAt",
      "totalAudienceCapacity",
      "tickets",
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        !eventDetails[field] ||
        (Array.isArray(eventDetails[field]) && eventDetails[field].length === 0)
    );

    return missingFields;
  }
}

module.exports = new EventService(eventRepository);
