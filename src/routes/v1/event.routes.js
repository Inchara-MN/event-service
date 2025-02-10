const express = require("express");
const router = express.Router();
const { middlewares } = require("common-utils");
const { authMiddleware } = middlewares;

const { eventController } = require("../../controllers");

router.post(
  "/",
  authMiddleware,
  eventController.createEvent.bind(eventController)
);

router.get(
  "/",
  authMiddleware,
  eventController.getAllEvents.bind(eventController)
);
router.get(
  "/:eventId",
  authMiddleware,
  eventController.getEventById.bind(eventController)
);
router.patch(
  "/",
  authMiddleware,
  eventController.updateEvent.bind(eventController)
);
router.patch(
  "/publish",
  authMiddleware,
  eventController.publishEvent.bind(eventController)
);
router.delete(
  "/",
  authMiddleware,
  eventController.deleteEvent.bind(eventController)
);

router.post(
  "/book",
  authMiddleware,
  eventController.bookEvent.bind(eventController)
);
router.post(
  "/verify",
  authMiddleware,
  eventController.verify.bind(eventController)
);

module.exports = router;
