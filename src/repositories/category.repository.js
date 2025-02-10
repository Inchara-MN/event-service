const { models } = require("common-utils");
const { Category } = models;

class CategoryRepository {
  async isCategoryNameExists({ userId, name, type }) {
    return await Category.findOne({
      userId,
      name,
      type,
    });
  }

  async createCategory(categoryData) {
    return await Category.create(categoryData);
  }
  

  async deleteCategory({ userId, name, type }) {
    const result = await Category.deleteOne({ userId, name, type });
    return result.deletedCount > 0;
  }
  async getCategoriesByUserId({ userId, type }) {
    try {
      const categories = await Category.find(
        { userId: userId, type: type },
        { name: 1, _id: 0 }
      );

      return categories.map((category) => category.name);
    } catch (error) {
      throw error;
    }
  }

  async getCategoryByCategoryId(categoryId) {
    try {
      const category = await Category.findOne(
        { _id: categoryId },
        { name: 1, _id: 0 }
      );

      if (!category) {
        throw new Error("Category not found");
      }

      return category.name;
    } catch (error) {
      console.error(
        "Error in EventCategoryRepository.getCategoryByCategoryId:",
        error.message
      );
      throw error;
    }
  }

  async updateCategory({ categoryId, name }) {
    try {
      const updatedCategory = await Category.findOneAndUpdate(
        { _id: categoryId },
        { name: name },
        { new: true }
      );

      if (!updatedCategory) {
        throw new Error("Category not found");
      }

      return updatedCategory;
    } catch (error) {
      console.error(
        "Error in EventCategoryRepository.updateCategory:",
        error.message
      );
      throw error;
    }
  }
  async validateCategoryCodes({ userId, categoriesToValidate }) {
    try {
      const validCategories = await Category.find({
        userId: userId,
        _id: { $in: categoriesToValidate },
      }).lean();

      const validCategoryIds = validCategories.map((category) =>
        category._id.toString()
      );

      const isValid = categoriesToValidate.every((id) =>
        validCategoryIds.includes(id.toString())
      );

      if (!isValid || validCategoryIds.length !== categoriesToValidate.length) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Error in EventCategoryRepository.validateCategoryCodes:",
        error.message
      );
      throw error;
    }
  }
}

module.exports = new CategoryRepository();
