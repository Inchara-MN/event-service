const { categoryService } = require("../services");
const { utils } = require("common-utils");
const { errorUtils } = utils;
const { ConflictError, NotFoundError, ValidationError } = errorUtils;

class CategoryController {
  constructor(categoryService) {
    this.categoryService = categoryService;
  }
  async createCategory(req, res, next) {
    try {
      const userId = req.userId;
      const { name, type } = req.body;

      if (!name) {
        return res.sendError(
          new ValidationError({
            message: "Category name required",
          })
        );
      }
      if (!type) {
        return res.sendError(
          new ValidationError({
            message: "Category type required",
          })
        );
      }

      const categoryExists = await this.categoryService.isCategoryNameExists({
        userId,
        name,
        type,
      });

      if (categoryExists) {
        return res.sendError(
          new ConflictError({
            message: "Category already exists",
          })
        );
      }

      const newCategory = await this.categoryService.createCategory({
        userId,
        name,
        type,
      });

      return res.sendSuccess({
        message: "Category created successfully",
        data: newCategory,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      const userId = req.userId;
      const { name, type } = req.body;

      if (!name) {
        return res.sendError(
          new ValidationError({
            message: "Category name required",
          })
        );
      }
      if (!type) {
        return res.sendError(
          new ValidationError({
            message: "Category type required",
          })
        );
      }

      const categoryExists = await this.categoryService.isCategoryNameExists({
        userId,
        name,
        type,
      });

      if (!categoryExists) {
        return res.sendError(
          new NotFoundError({
            message: "Category does not exist",
          })
        );
      }

      const deleted = await this.categoryService.deleteCategory({
        userId,
        name,
        type,
      });

      if (deleted) {
        return res.sendSuccess({
          message: "Category deleted successfully",
        });
      } else {
        return res.sendError(
          new NotFoundError({
            message: "Category could not be deleted",
          })
        );
      }
    } catch (error) {
      next(error);
    }
  }

  async getAllCategories(req, res, next) {
    try {
      const userId = req.userId;
      const { type } = req.body;

      const categories = await this.categoryService.getAllCategories({
        userId,
        type,
      });

      if (categories.length === 0) {
        return res.sendError(
          new NotFoundError({
            message: "No categories found for this user",
          })
        );
      }

      return res.sendSuccess({
        message: "Categories fetched successfully",
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }
  async updateCategory(req, res, next) {
    try {
      const { name, categoryId } = req.body;

      if (!name || !categoryId) {
        return res.sendError(
          new ValidationError({
            message: "Both name and categoryId are required",
          })
        );
      }

      const categoryName =
        await this.categoryService.getCategoryByCategoryId(categoryId);

      if (categoryName === name) {
        return res.sendError(
          new ConflictError({
            message: "Category already exists",
          })
        );
      }

      const updatedCategory = await this.categoryService.updateCategory({
        categoryId,
        name,
      });

      return res.sendSuccess({
        message: "Category updated successfully",
        data: updatedCategory,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController(categoryService);
