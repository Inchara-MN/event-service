const { productService , categoryService } = require("../services");
const { utils} = require("common-utils");
const { errorUtils } = utils;

const {
  NotFoundError,
  ValidationError,
  ActionNotAllowedError,
  PaymentFailedError,
} = errorUtils;

class ProductController {
  constructor(productService,categoryService) {
    this.productService = productService;
    this.categoryService = categoryService;
  }

  async addProduct(req, res, next) {
    try {
      const { userId, body } = req ;
      const productData=body;
      if (!userId) throw new ValidationError("UserId is required.");
  
      const newProduct = await this.productService.createproduct({ userId });

      if (Object.keys(productData).length > 0) {
        const updatedProduct = await this.modifyProduct(newProduct._id, productData);
        return res.sendSuccess({
          message: "Product created and updated successfully",
          data: updatedProduct,
        });
      }
  
      res.sendSuccess({
        message: "Product created successfully",
        data: newProduct,
      });
    } catch (error) {
      next(error);
    }
  }
  
  async modifyProduct(req, res, next) {
    try {
      const { userId, body } = req;
     const {productId, variant = [], promoter = [], ...productData } = body;
  
      if (!productId) throw new ValidationError("Product ID is required.");
      if (!userId) throw new ValidationError("User ID is required.");
  
      const product = await this.productService.findProductById(productId);
  
      if (variant && variant.variants && variant.variants.length > 0) {
        const variantIds = await this.handleVariants(productId, userId, variants.variants);
        await product.addVariants(variantIds);
      }
  
      if (promoter && promoter.promoters && promoter.promoters.length > 0) {
        const promoterIds = await this.handlePromoters(productId, userId, promoter.promoters);
        await product.addPromoters(promoterIds);
      }
  
      delete productData.variant?.variants;
      delete productData.promoter?.promoters;

      const updatedProduct = await this.productService.updateProduct(productId, productData);
  
      res.sendSuccess({
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      next(error);
    }
  }

    async modifyOrderstatus(req, res, next) {
      try {
        const { body } = req;
        const { productId, status } = body;
    
        if (!productId) throw new ValidationError("Product ID is required.");
        if (!status) throw new ValidationError("Status is required.");
    
        const updatedProduct = await this.productService.updateOrderStatus(productId, status);
    
        res.sendSuccess({
          message: "Product status updated successfully",
          data: updatedProduct,
        });
      } catch (error) {
        next(error);
      }
    }   

async handleVariants(productId, userId, existingVariants) {
  const variantIds = [];
  const session = await mongoose.startSession(); // Start a new session for the transaction

  try {
    session.startTransaction(); // Begin transaction

    for (const variant of existingVariants) {
      if (variant.variantId) {
        // Update existing variant
        await this.productService.updateVariant(variant.variantId, userId, variant, { session });
      } else {
        // Create new variant
        const newVariant = await this.productService.createVariant({
          ...variant,
          productId,
        }, { session });
        variantIds.push(newVariant._id);
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    return variantIds;
  } catch (error) {
    // If any error occurs, rollback all changes in the transaction
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Failed to handle variants: ${error.message}`);
  }
}

async handlePromoters(productId, userId, existingPromoters) {
  const promoterIds = [];
  const session = await mongoose.startSession(); // Start a new session for the transaction

  try {
    session.startTransaction(); // Begin transaction

    for (const promoter of existingPromoters) {
      if (promoter.promoterId) {
        // Update existing promoter
        await this.productService.updatePromoter(promoter.promoterId, userId, promoter, { session });
      } else {
        // Create new promoter
        const newPromoter = await this.productService.createPromoter({
          ...promoter,
          productId,
        }, { session });
        promoterIds.push(newPromoter._id);
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();
    return promoterIds;
  } catch (error) {
    // If any error occurs, rollback all changes in the transaction
    await session.abortTransaction();
    session.endSession();
    throw new Error(`Failed to handle promoters: ${error.message}`);
  }
}

async getAllProducts(req, res, next) {
    try {
      const filters = {
        category: req.query.category || null,
        price: req.query.price
          ? JSON.parse(req.query.price)
          : null,
        status: req.query.status || "active",
      };
      const sortOrder = parseInt(req.query.sortOrder, 10) || 1;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      if (req.query.keyword) {
        let query = req.query.keyword;
        query = decodeURIComponent(query);

        const { products, total } = await this.productService.searchProducts({
          query,
          page,
          limit,
        });

        const meta = {
          page,
          total,
          length: products.length,
        };

        return res.sendSuccess({
          message: "Products fetched successfully",
          data: products,
          meta,
        });
      }

      const { products, total } = await this.productService.getAllProducts({
        filters,
        sortOrder,
        page,
        limit,
      });

      const meta = {
        page,
        total,
        length: products.length,
      };
      return res.sendSuccess({
        message: "Products fetched successfully",
        data: products,
        meta,
      });
    } catch (error) {
      console.error("Error in ProductController:", error.message);
      next(error);
    }
}

  async getProductById(req, res, next) {
    try {
      const { productId } = req.params;
      if (!productId) throw new ValidationError("Product ID is required.");
      const product = await this.productService.getProductById(productId);
      if (!product) throw new NotFoundError("Product not found.");
      res.sendSuccess({ message: "Product fetched successfully", data: product });
    } catch (error) {
      next(error);
    }
  }

  async getProductByuserId(req, res, next) {
    try {
      const { userId } = req;
      if (!userId) throw new ValidationError("User ID is required.");
      const products = await this.productService.getProductByUserId(userId);
      res.sendSuccess({ message: "User's Products fetched successfully", data: products });
    } catch (error) {
      next(error);
    }
  }

  async deactivateProduct(req, res, next) {
    try {
      const { body } = req;
      const { productId } = body;
      if (!productId) throw new ValidationError("Product ID is required.");
      const disabledProduct = await this.productService.disableProduct(productId);
      res.sendSuccess({ message: "Product disabled successfully", data: disabledProduct });
    } catch (error) {
      next(error);
    }
  }

  async disablePromoter(req, res, next) {
    try {
      const { body } = req;
      const { promoterId } = body;
      if (!promoterId) throw new ValidationError("promoter ID is required.");
      const disabledpromoter = await this.productService.disablePromoter(promoterId);
      res.sendSuccess({ message: "promoter disabled successfully", data: disabledpromoter });
    } catch (error) {
      next(error);
    }
  }

  async modifyPromoter(req, res, next) {
    try {
      const { body } = req;
      const { promoterId,...updateData } = body;
      if (!promoterId) throw new ValidationError("promoter ID is required.");
      const updatedpromoter = await this.productService.updatePromoter(promoterId,updateData);
      res.sendSuccess({ message: "promoter updated successfully", data: updatedpromoter });
    } catch (error) {
      next(error);
    }
  }

  async disableVariant(req, res, next) {
    try {
      const { body } = req;
      const { variantId } = body;
      if (!variantId) throw new ValidationError("variant ID is required.");
      const disabledvariant = await this.productService.disableVariant(variantId);
      res.sendSuccess({ message: "variant disabled successfully", data: disabledvariant });
    } catch (error) {
      next(error);
    }
  }

  async addProductAndActivate(req, res, next) {
    try {
      const { productId } = req.body;  // productId is passed in the request body
      if (!productId) throw new ValidationError("Product ID is required.");

      // Set the product and its related variants and promoters to ACTIVE status
      await this.productService.activateProductAndRelations(productId);

      res.sendSuccess({ message: "Product and related details activated successfully." });
    } catch (error) {
      next(error);
    }
  }

  async getVariantByproductId(req, res, next) {
    try {
      const { productId } = req.params;
      if (!productId) throw new ValidationError("Product ID is required.");
      const variants = await this.productService.getVariantByproductId(productId);
      res.sendSuccess({ message: "Product variants fetched successfully", data: variants });
    } catch (error) {
      next(error);
    }
  }

  async getVariantById(req, res, next) {
    try {
      const { variantId } = req.params;
      if (!variantId) throw new ValidationError("Variant ID is required.");
      const variant = await this.productService.getVariantById(variantId);
      res.sendSuccess({ message: "Product variant fetched successfully", data: variant });
    } catch (error) {
      next(error);
    }
  }

  async getPromotersByProduct(req, res, next) {
    try {
      const { productId } = req.params;
      if (!productId) throw new ValidationError("Product ID is required.");
      const promoters = await this.productService.getPromotersByProduct(productId);
      res.sendSuccess({ message: "Promoters fetched successfully", data: promoters });
    } catch (error) {
      next(error);
    }
  }

  async getPromoterById(req, res, next) {
    try {
      const { params } = req;
      const { promoterId } = params;
      if (!promoterId) throw new ValidationError("Promoter ID is required.");
      const promoter = await this.productService.getPromoterById(promoterId);
      res.sendSuccess({ message: "Promoter fetched successfully", data: promoter });
    } catch (error) {
      next(error);
    }
  }

  async addToCart(req, res, next) {
    try {
      const { userId, body } = req;
      const { variantId, quantity } = body;
      if (!variantId || !quantity) throw new ValidationError("Variant ID and quantity are required.");
      const cartItem = await this.productService.addToCart({ userId, variantId, quantity });
      res.sendSuccess({ message: "Item added to cart successfully", data: cartItem });
    } catch (error) {
      next(error);
    }
  }

  async getCartByUser(req, res, next) {
    try {
      const { userId } = req;
      const cart = await this.productService.getCartByUser(userId);
      res.sendSuccess({ message: "Cart fetched successfully", data: cart });
    } catch (error) {
      next(error);
    }
  }

  async getCartById(req, res, next) {
    try {
      const { cartId } = req.params;
      if (!cartId) throw new ValidationError("Cart ID is required.");
      const cart = await this.productService.getCartById(cartId);
      res.sendSuccess({ message: "Cart fetched successfully", data: cart });
    } catch (error) {
      next(error);
    }
  }

  async modifyCart(req, res, next) {
    try {
      const { body } = req;
      const { cartId, quantity } = body;
      if (!cartId || !quantity) throw new ValidationError("Cart ID and quantity are required.");
      const updatedCart = await this.productService.updateCart(cartId, { quantity });
      res.sendSuccess({ message: "Cart updated successfully", data: updatedCart });
    } catch (error) {
      next(error);
    }
  }

  async addOrder(req, res, next) {
    try {
      const { userId, body } = req;
      const { orderData } = body;
      const { orderDetails, productDetails } = orderData;
      
      const missingAttributes = [];

      if (!orderDetails) missingAttributes.push("orderDetails");
      if (!productDetails) missingAttributes.push("productDetails");

      if (missingAttributes.length > 0) {
        return res.sendError(
          new ValidationError({
            message: `Required attributes are missing: ${missingAttributes.join(", ")}`,
          })
        );
      }

      if (!orderData || !userId) throw new ValidationError("Order data and user ID are required.");


      const newOrder = await this.productService.processOrder({ userId,orderData });
      const orderCreated = newOrder.paymentData.data;

      res.sendSuccess({ message: "Order created successfully", data: orderCreated });
    } catch (error) {
      next(error);
    }
  }

  async getByuserId(req, res, next) {
    try {
      const { params } = req;
      const { userId } = params;
      if (!userId) throw new ValidationError("User ID is required.");
      const orders = await this.productService.getOrdersByUserId(userId);
      res.sendSuccess({ message: "Orders fetched successfully", data: orders });
    } catch (error) {
      next(error);
    }
  }

  async getByproductId(req, res, next) {
    try {
      const { params } = req;
      const { productId } = params;
      if (!productId) throw new ValidationError("Product ID is required.");
      const orders = await this.productService.getOrdersByProductId(productId);
      res.sendSuccess({ message: "Orders fetched for product successfully", data: orders });
    } catch (error) {
      next(error);
    }
  }

  async getOrderById(req, res, next) {
    try {
      const { params } = req;
      const { orderId } = params;
      if (!orderId) throw new ValidationError("Order ID is required.");
      const order = await this.productService.getOrderById(orderId);
      res.sendSuccess({ message: "Order fetched successfully", data: order });
    } catch (error) {
      next(error);
    }
  }

  async modifyOrder(req, res, next) {
    try {
      const { body } = req;
      const { orderId, updateData } = body;
      if (!orderId || !updateData) throw new ValidationError("Order ID and update data are required.");
      const updatedOrder = await this.productService.updateOrder(orderId, updateData);
      res.sendSuccess({ message: "Order updated successfully", data: updatedOrder });
    } catch (error) {
      next(error);
    }
  }

  async verify(req, res, next) {
    try {
      const paymentInfo = req.body;

      const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
        paymentInfo;

      if (
        !orderId ||
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature
      ) {
        return res.sendError(
          new ValidationError({ message: "Required attributes are missing" })
        );
      }

      const isPaymentValid = await this.productService.verifyPayment({
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
      const orderData =
        await this.productService.updateOrderAfterPayment(orderId);
      return res.sendSuccess({
        message: "Order placed successfully!",
        data: orderData,
      });
    } catch (error) {
      next(error);
    }

    
    
  }
  //reviews 
  async addReview(req, res, next) {
    try {
        const { productId } = req.params;
        const { UID } = req; // Ensure userId is set by middleware
        const { userId, rating, content, type,username,email } = req.body;

        console.log("Received Data:", { productId, userId, rating, content, type });

        // Validation
        if (!productId) throw new ValidationError("Product ID is required.");
        if (!userId) throw new ValidationError("User ID is required.");
        if (!type || type !== "product") throw new ValidationError("Valid type is required (must be 'product').");
        if (!rating || rating < 1 || rating > 5) throw new ValidationError("Valid rating is required (1-5).");
        if (!content) throw new ValidationError("Review comment is required.");

        // Add review via service
        const review = await this.productService.addReview(productId, userId, { rating, content, type,username, email });

        res.sendSuccess({ message: "Review added successfully", data: review });
    } catch (error) {
        console.error("Error in addReview:", error.message);
        next(error);
    }
  }
  async viewReviewsAndReplies(req, res, next) {
    try {
        const { productId } = req.params;
        if (!productId) throw new ValidationError("Product ID is required.");

        // Fetch reviews with replies using the productId
        const reviews = await this.productService.getReviewsByProductId(productId);

        res.sendSuccess({
            message: "Reviews fetched successfully",
            data: reviews,
        });
    } catch (error) {
        next(error);
    }
  }

  // reply for comment
  async commentReply(req, res, next) {
    try {
        const { commentId } = req.params; // Extract commentId from URL
        const { userId, name, email, message } = req.body; // Extract body fields

        console.log("Reply Data Received:", { commentId, userId, name, email, message });

        // Validation
        if (!commentId) throw new ValidationError("Comment ID is required.");
        if (!userId) throw new ValidationError("User ID is required.");
        if (!name) throw new ValidationError("Name is required.");
        
        if (!message || message.trim().length === 0) throw new ValidationError("Message is required.");

        // Call the service to handle the reply
        const updatedComment = await this.productService.addReplyToComment(commentId,
            userId,
            name,
            email,
            message,
            );

        res.sendSuccess({ message: "Reply added successfully", data: updatedComment });
    } catch (error) {
        console.error("Error in commentReply:", error.message);
        next(error);
    }
  }

  //delete reply
  async deleteReply(req, res, next) {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;

        if (!commentId) {
            throw new Error("Comment ID is required.");
        }
        if (!userId) {
            throw new Error("User ID is required.");
        }

        const result = await this.productService.deleteReply(commentId, userId);
        res.sendSuccess({ message: "Reply deleted successfully", data: result });
    } catch (error) {
        console.error("Error in deleteReply:", error.message);
        next(error);
    }
}




}
module.exports = new ProductController(productService,categoryService);
