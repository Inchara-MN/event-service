const express = require("express");
const router = express.Router();
const { middlewares } = require("common-utils");
const { authMiddleware } = middlewares;

const { categoryController } = require("../../controllers");
router.get(
  "/",
  authMiddleware,
  categoryController.getAllCategories.bind(categoryController)
);
router.post(
  "/",
  authMiddleware,
  categoryController.createCategory.bind(categoryController)
);
router.patch(
  "/",
  authMiddleware,
  categoryController.updateCategory.bind(categoryController)
);

router.delete(
  "/",
  authMiddleware,
  categoryController.deleteCategory.bind(categoryController)
);

module.exports = router;
