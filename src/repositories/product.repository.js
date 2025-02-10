const { models,constants } = require("common-utils");
const { Product, Variant, Promoter, Cart, Order,Comment } = models;
const {SORT_ORDER}=constants;
class ProductRepository {
  async createProduct({ userId }) {
    try {
      const product = await Product.create({ userId });
      return product;
    } catch (error) {
      console.error("Error creating product:", error);
      throw new Error("Could not create the product. " + error.message);
    }
  }

    async getAllProducts(filters, sortOrder, page, limit) {
        const query = {};
        const currentDate = new Date();
        if (filters.category) {
          query.categories = { $in: filters.category };
        }
        
        // Handle price filtering
        if (filters.price) {
            const { min, max } = filters.price;
            query.price = { $gte: min || 0, $lte: max || Infinity };
        }
        
        // Handle sorting
        let sortOptions = {};
        switch (sortOrder) {
            case SORT_ORDER.POPULAR:
                sortOptions.productsSold = -1;
                break;
            case SORT_ORDER.MOST:
                sortOptions.createdAt = -1;
                break;
            case SORT_ORDER.LEAST:
                sortOptions.createdAt = 1;
                break;
            case SORT_ORDER.HIGH_TO_LOW:
                sortOptions.price = -1;
                break;
            case SORT_ORDER.LOW_TO_HIGH:
                sortOptions.price = 1;
                break;
            default:
                sortOptions.createdAt = -1; // Default sorting by newest
        }
        
        const skip = (page - 1) * limit;
        
        const products = await Product.find(query)
            .sort(sortOptions)
          .skip(skip)
          .limit(limit);
    
        const totalProducts = await Product.countDocuments(query);
    
        return {
          totalProducts,
          page,
          limit,
          products,
        };
      }

      async searchProducts({ query, calculatedOffset, calculatedLimit }) {
        const searchQuery = {
          title: { $regex: query, $options: "i" }, // Case-insensitive search on product title
        };
    
        const products = await Product.find(searchQuery)
          .skip(calculatedOffset)
          .limit(calculatedLimit)
          .lean();
    
        const total = await Product.countDocuments(searchQuery);
    
        return { data: products, total };
      }

  async getProductById(productId) {
    try {
      const product = await Product.findById(productId);
      return product;
    } catch (error) {
      throw error;
    }
  }

  async getProductByUserId(userId) {
    try {
      const products = await Product.find({ userId });
      return products;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(productId, updateData) {
    try {
      return await Product.findByIdAndUpdate(productId, updateData, {
        new: true,
      });
    } catch (error) {
      throw new Error(`Error updating product: ${error.message}`);
    }
  }

  async disableProduct(productId) {
    try {
      const product = await Product.findById(productId);
      if (product) {
        product.status = "archive";
        await product.save();
        return product;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async disablePromoter(promoterId) {
    try {
      const promoter = await Promoter.findById(promoterId);
      if (promoter) {
        promoter.status = "REMOVED";
        await promoter.save();
        return promoter;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async disableVariant(variantId) {
    try {
      const variant = await Variant.findById(variantId);
      if (variant) {
        variant.status = "INACTIVE";
        await variant.save();
        return variant;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async updateProductStatus(productId, status) {
    try {
      const product = await Product.findById(productId);
      if (product) {
        product.status = status;
        await product.save();
        return product;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async updateorderStatus(productId, status) {
    try {
      const product = await Product.findById(productId);
      if (product) {
        product.status = status;
        await product.save();
        return product;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async createVariant({ productId, variantData }) {
    try {
      const variant = await Variant.create({ productId, ...variantData });
      return variant;
    } catch (error) {
      throw error;
    }
  }

  async getVariantByProductId(productId) {
    try {
      console.log("Fetching variants for productId:", productId);
      const variants = await Variant.find({ productId });
      return variants;
    } catch (error) {
      console.error("Error fetching variants:", error);
      throw error;
    }
  }
  

  async updateVariant(variantId, updateData) {
    try {
      const variant = await Variant.findById(variantId);
      if (variant) {
        Object.assign(variant, updateData);
        await variant.save();
        return variant;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async createPromoter({ productId, promoterData }) {
    try {
      const promoter = await Promoter.create({ productId, ...promoterData });
      return promoter;
    } catch (error) {
      throw error;
    }
  }

  async getPromotersByProduct(productId) {
    try {
      const promoters = await Promoter.find({ productId });
      return promoters;
    } catch (error) {
      throw error;
    }
  }

  async updatePromoter(promoterId, updateData) {
    try {
      const promoter = await Promoter.findById(promoterId);
      if (promoter) {
        Object.assign(promoter, updateData);
        await promoter.save();
        return promoter;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async addToCart({ userId, variantId, quantity }) {
    try {
      const cartItem = await Cart.create({ userId, variantId, quantity });
      return cartItem;
    } catch (error) {
      throw error;
    }
  }

  async getCartByUser(userId) {
    try {
      const cart = await Cart.find({ userId });
      return cart;
    } catch (error) {
      throw error;
    }
  }

  async updateCart(cartId, updateData) {
    try {
      const cartItem = await Cart.findById(cartId);
      if (cartItem) {
        Object.assign(cartItem, updateData);
        await cartItem.save();
        return cartItem;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  async createOrder({ orderData }) {
    try {
      const order = await Order.create({ orderData });
      return order;
    } catch (error) {
      throw error;
    }
  }

  async checkOfferValid({ variantId, quantity, totalAmount }) {
    try {
      const variant = await this.getVariantWithProductDetails(variantId);
      if (!variant) return 0;

      const { product } = variant;
      const offer = product.offer;

      if (!offer || !offer.startAt || !offer.endAt || !offer.percentage || !offer.quantityApplicable) {
        return 0;
      }

      const currentDate = new Date();
      const offerStartDate = new Date(offer.startAt);
      const offerEndDate = new Date(offer.endAt);

      if (currentDate < offerStartDate || currentDate > offerEndDate) {
        return 0;
      }

      const productsSold = product.productsSold || 0;
      const eligibleOfferItems = Math.max(0, offer.quantityApplicable - productsSold);

      if (eligibleOfferItems <= 0) {
        return 0;
      }

      const itemsEligibleForDiscount = Math.min(quantity, eligibleOfferItems);

      if (itemsEligibleForDiscount > 0) {
        const discount = (totalAmount * offer.percentage) / 100;
        return discount;
      }

      return 0;
    } catch (error) {
      console.error("Error in checkOfferValid:", error.message);
      return 0;
    }
  }

  async getVariantWithProductDetails(variantId) {
    return await Variant.findById(variantId).populate("productId").exec();
  }

  async checkItemAvailable({ variantId, quantity }) {
    const variant = await this.getVariantById(variantId);
    return variant.checkStock(quantity);
  }

  async updatePaymentStatus(orderId, status) {
    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { "paymentDetails.paymentStatus": status } },
      { new: true }
    );
    return updatedOrder;
  }

  async getOrdersByUserId(userId) {
    try {
      const orders = await Order.find({ userId });
      return orders;
    } catch (error) {
      throw error;
    }
  }

  async updateOrder(orderId, updateData) {
    try {
      const order = await Order.findById(orderId);
      if (order) {
        Object.assign(order, updateData);
        await order.save();
        return order;
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
  // reviews
  async addReview(reviewData) {
    try {
        console.log(reviewData)
        const { userId, productId, rating, content,username , email, type } = reviewData;

        // Ensure all required fields are provided
        if (!userId || !productId || !rating || !content || !type || !email || !username) {
            throw new Error(
                "Missing required fields: userId, productId, rating, comment, type, email, or username."
            );
        }

        // Check if a review by this user for this product already exists
        const existingReview = await Comment.findOne({ userId, productId, type: "product" });

        if (existingReview) {
            // Update the existing review
            existingReview.rating = rating;
            existingReview.content = content;
            existingReview.email = email;
            existingReview.username = username;
            existingReview.updatedAt = Date.now();

            const updatedReview = await existingReview.save();
            console.log("Review updated successfully.");
            return updatedReview;
        }

        // If no existing review, create a new one
        const newReviewData = {
            userId,
            productId,
            rating,
            content: content,
            type,
            email,
            username,
        };
        const newReview = await Comment.create(newReviewData);
        console.log("Review created successfully.");
        return newReview;
    } catch (error) {
        console.error("Error adding/updating review:", error.message);
        throw new Error("Failed to add or update review in the database.");
    }
}


  async getReviewsByProductId(productId) {
    try {
        // Find reviews for the given product and include specific fields
        const reviews = await Comment.find({ productId, type: "product" })
            .select("userId rating content replies") // Fetch specific fields
            .populate("userId", "username") // Include username for userId
            .populate("replies.userId", "username") // Include username for replies' userId
            .lean();

        return reviews;
    } catch (error) {
        console.error("Error fetching reviews from the database:", error.message);
        throw new Error("Failed to fetch reviews.");
    }
  }

  //review reply
  async addReplyToComment(commentId, userId, username, email, content) {
    try {
        // Validate required fields
        if (!userId || !username || !email || !content) {
            throw new Error("Missing required fields: userId, username, email, or content.");
        }

        // Fetch the comment by ID
        const comment = await Comment.findById(commentId);
        if (!comment) {
            throw new Error("Comment not found.");
        }

        // Check if a reply from the same user already exists
        const existingReply = comment.replies.find(
            (reply) => reply.userId.toString() === userId.toString()
        );

        if (existingReply) {
            // Update the existing reply content, username, and email
            existingReply.content = content;
            existingReply.username = username;
            existingReply.email = email;
            existingReply.updatedAt = new Date();
            console.log("Reply updated successfully.");
        } else {
            // Add the new reply to the replies array
            comment.replies.push({
                userId,
                username:username,
                email:email,
                content,
                createdAt: new Date(),
            });
            console.log("Reply added successfully.");
        }

        // Save the updated comment
        const updatedComment = await comment.save();
        return updatedComment;
    } catch (error) {
        console.error("Error in addReplyToComment:", error.message);
        throw new Error("Failed to add or update reply in the database.");
    }
}

//remove reply
async deleteReply(commentId, userId) {
  try {
      // Use $pull to remove the reply directly in the database
      const result = await Comment.updateOne(
          { _id: commentId },
          { $pull: { replies: { userId: userId } } }
      );

      if (result.nModified === 0) {
          throw new Error("Reply not found or not deleted.");
      }

      console.log("Reply deleted successfully.");
      return { success: true, message: "Reply deleted successfully." };
  } catch (error) {
      console.error("Error in deleteReply:", error.message);
      throw new Error("Failed to delete reply.");
  }
}






}

module.exports = new ProductRepository();
