const { productRepository } = require("../repositories");
const axios = require("axios");
const { utils} = require("common-utils");
const { generateOrderId } = utils;
const { generateOrderNumber } = generateOrderId;
const { config } = require("common-utils");
const { envConfig } = config;
const { PAYMENT_BASE_URL } = envConfig;

class ProductService {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async updateOrderStatus(productId, status) {
    return await productRepository.updatedorderStatus(productId, status);
  }

  async activateProductAndRelations(productId) {
    await this.productRepository.updateProductStatus(productId, "active");
    const variants = await this.productRepository.getVariantByProductId(productId);
    if (variants?.length) {
      for (const variant of variants) {
        await this.productRepository.updateVariantStatus(variant._id, "ACTIVE");
      }
    }
    const promoters = await this.productRepository.getPromotersByProduct(productId);
    if (promoters?.length) {
      for (const promoter of promoters) {
        await this.productRepository.updatePromoterStatus(promoter._id, "ACTIVE");
      }
    }
  }

  async checkOfferValid({ variantId, quantity, totalAmount }) {
    return await this.productRepository.checkOfferValid({ variantId, quantity, totalAmount });
  }

  async checkitemsAvailable({ variantId, totalitemsRequested }) {
    return await this.productRepository.checkitemsAvailable({ variantId, totalitemsRequested });
  }

  async createproduct({ userId }) {
    return await this.productRepository.createProduct({ userId });
  }

  async processOrder({ orderData }) {
    const { productDetails, ...orderDetails } = orderData;
    const { variantId, quantity } = productDetails;
    const variant = await this.getVariantById(variantId);
    const totalAmount = await this.calculateTotalAmount(quantity, variant);
    const itemsAvailable = await this.checkitemsAvailable({ variantId, quantity, totalAmount });
    if (!itemsAvailable) throw new Error("Item Quantity Requested Not Available");
    const discount = await this.checkOfferValid({ variantId, quantity, totalAmount });
    const discountedAmount = totalAmount - discount;
    const orderNumber = await generateOrderNumber("ORD");
    const paymentResponse = await this.initiatePayment(orderNumber, discountedAmount);
    const paymentData = paymentResponse.data;
    const orderPayload = {
      orderNumber,
      productDetails,
      orderDetails,
      orderData: { numberOfItems: quantity, price: totalAmount, offerDiscountAmount: discount, totalPrice: discountedAmount },
      paymentDetails: { razorpayOrderId: paymentData.data.id, razorpayPaymentId: "", paymentStatus: "pending", transactionType: "product" },
    };
    return await productRepository.createOrder({ orderPayload });
  }

  async calculateTotalAmount(quantity, variant) {
    if (!variant || !variant.price) throw new Error("Invalid variant data: Price not found.");
    return variant.price * quantity;
  }

  async initiatePayment(orderNumber, amount) {
    return await axios.post(`${PAYMENT_BASE_URL}/initiate-payment`, { amount, receipt: orderNumber, currency: "INR" });
  }

  async verifyPayment({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const response = await axios.post(`${PAYMENT_BASE_URL}/validate-payment`, { orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature });
    return response.data;
  }

  async getAllProducts({ filters, sortOrder, page, limit }) {
      const { calculatedPage, calculatedLimit, calculatedOffset } =
        await this.calculateOffset({ page, limit });
  
      const { products, total } = await this.productRepository.getAllProducts({
        filters,
        sortOrder,
        calculatedOffset,
        calculatedLimit,
      });
  
      return { products, total };
    }

  async calculateOffset({ page, limit }) {
    const calculatedPage = Math.max(1, parseInt(page) || 1);
    const calculatedLimit = Math.min(Math.max(parseInt(limit) || 10, 5), 20);

    const calculatedOffset = (page - 1) * limit;
    return { calculatedPage, calculatedLimit, calculatedOffset };
  }
  async searchProducts({ query, page, limit }) {
    const { calculatedPage, calculatedLimit, calculatedOffset } =
      await this.calculateOffset({ page, limit });

    const { data: products, total } = await this.productRepository.searchProducts({
      query,
      calculatedOffset,
      calculatedLimit,
    });
    return { products, total };
  }

  async getProductById(productId) {
    return await productRepository.getProductById(productId);
  }

  async getProductByUserId(userId) {
    return await productRepository.getProductByUserId(userId);
  }

  async updateProduct(productId, updateData) {
    return await productRepository.updateProduct(productId, updateData);
  }

  async disableProduct(productId) {
    return await productRepository.disableProduct(productId);
  }

  async disablePromoter(promoterId) {
    return await productRepository.disablePromoter(promoterId);
  }

  async disableVariant(variantId) {
    return await productRepository.disableVariant(variantId);
  }

  async createVariant({ productId, variantData }) {
    return await productRepository.createVariant({ productId, variantData });
  }

  async getVariantByProductId(productId) {
    return await productRepository.getVariantByProductId(productId);
  }

  async getVariantById(variantId) {
    return await productRepository.getVariantById(variantId);
  }

  async updateVariant(variantId, updateData) {
    return await productRepository.updateVariant(variantId, updateData);
  }

  async createPromoter({ productId, promoterData }) {
    return await productRepository.createPromoter({ productId, promoterData });
  }

  async getPromotersByProduct(productId) {
    return await productRepository.getPromotersByProduct(productId);
  }

  async getPromoterById(promoterId) {
    return await productRepository.getPromoterById(promoterId);
  }

  async updatePromoter(promoterId, updateData) {
    return await productRepository.updatePromoter(promoterId, updateData);
  }

  async addToCart({ userId, variantId, quantity }) {
    return await productRepository.addToCart({ userId, variantId, quantity });
  }

  async getCartByUser(userId) {
    return await productRepository.getCartByUser(userId);
  }

  async getOrdersByUserId(userId) {
    return await productRepository.getOrdersByUserId(userId);
  }

  async updateOrderAfterPayment(orderId) {
    const orderRecord = await this.productRepository.getBookingByOrderId(orderId);
    if (!orderRecord) throw new Error("Order record not found");
    const updatedOrderData = await this.productRepository.updatePaymentStatus(orderId, "completed");
    const { variantId, quantity } = updatedOrderData;
    const variantData = await this.getVariantById(variantId);
    if (!variantData) throw new Error("Variant data not found");
    if (!variantData.checkStock(quantity)) throw new Error("Not enough stock available");
    await variantData.updateStockAndProductsSold(quantity);
    return updatedOrderData;
  }

  // reviews
  async addReview(productId, userId, { rating, content, username, email }) {
    // Validate product existence
    // const product = await this.productRepository.getProductById(productId);
    // if (!product) {
    //     throw new Error("Product not found.");
    // }

    // // Validate user existence (optional if you want to ensure valid users)
    // const user = await this.userRepository.getUserById(userId);
    // if (!user) {
    //     throw new Error("User not found.");
    // }

    // Check for existing review by the same user for the same product
    // const existingReview = await this.productRepository.getReviewByUserAndProduct(userId, productId);

    // If no existing review, create a new one
    const reviewData = {
        userId,
        productId,
        rating,
        content,
        username,
        email,
        type: "product",
    };

    // Save the review using the repository
    return await this.productRepository.addReview(reviewData);
}

  //view revies and replies
  async getReviewsByProductId(productId) {
    try {
        // Fetch reviews for the given product and populate replies
        const reviews = await this.productRepository.getReviewsByProductId(productId);
        return reviews;
    } catch (error) {
        console.error("Error fetching reviews:", error.message);
        throw new Error("Failed to fetch reviews.");
    }
  }

  //reply for comments
  async addReplyToComment(commentId, userId,
    name,
    email,
    message,) {
    try {
        // Validate and process the reply through the repository
        
        const updatedComment = await this.productRepository.addReplyToComment(commentId,userId,
          name,
          email,
          message,);

        return updatedComment;
    } catch (error) {
        console.error("Error in addReplyToComment:", error.message);
        throw new Error("Failed to add reply to the comment.");
    }
  }

  //delete reply
  async deleteReply(commentId, userId) {
    try {
        if (!commentId || !userId) {
            throw new Error("Comment ID and User ID are required.");
        }

        const updatedComment = await this.productRepository.deleteReply(commentId, userId);
        if (!updatedComment) {
            throw new Error("Reply not found or already deleted.");
        }

        console.log("Reply deleted successfully.");
        return updatedComment;
    } catch (error) {
        console.error("Error in deleteReply:", error.message);
        throw new Error("Failed to delete reply.");
    }
}



}

module.exports = new ProductService(productRepository);
