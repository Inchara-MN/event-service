const { categoryRepository } = require("../repositories");

class CategoryService {
  constructor(categoryRepository) {
    this.categoryRepository = categoryRepository;
  }
  async isCategoryNameExists({ userId, name, type }) {
    return await this.categoryRepository.isCategoryNameExists({
      userId,
      name,
      type,
    });
  }

  async createCategory({ userId, name, type }) {
    return await this.categoryRepository.createCategory({
      userId,
      name,
      type,
    });
  }

  async deleteCategory({ userId, name, type }) {
    return await this.categoryRepository.deleteCategory({
      userId,
      name,
      type,
    });
  }
  async getAllCategories({ userId, type }) {
    return await this.categoryRepository.getCategoriesByUserId({
      userId,
      type,
    });
  }

  async getCategoryByCategoryId(categoryId) {
    return await this.categoryRepository.getCategoryByCategoryId(categoryId);
  }
  async updateCategory({ categoryId, name }) {
    return await this.categoryRepository.updateCategory({
      categoryId,
      name,
    });
  }
  async validateCategoryCodes({ userId, categoriesToValidate }) {
    return await this.categoryRepository.validateCategoryCodes({
      userId,
      categoriesToValidate,
    });
  }
}

module.exports = new CategoryService(categoryRepository);
