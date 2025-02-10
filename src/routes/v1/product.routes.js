const express = require("express");
const router = express.Router();
const { productController } = require("../../controllers");
const { middlewares } = require("common-utils");
const { authMiddleware } = middlewares;

router.post("/", authMiddleware,productController.addProduct.bind(productController));
router.post("/activate", authMiddleware,productController.addProductAndActivate.bind(productController));

router.get("/", productController.getAllProducts.bind(productController));// working
router.get("/:productId", authMiddleware,productController.getProductById.bind(productController));
router.get("/:userId",authMiddleware, productController.getProductByuserId.bind(productController));

router.patch("/",authMiddleware, productController.modifyProduct.bind(productController));
router.patch("/deactivate",authMiddleware, productController.deactivateProduct.bind(productController));

router.get("/variant/:productId", authMiddleware,productController.getVariantByproductId.bind(productController));
router.get("/variant/:variantId",authMiddleware, productController.getVariantById.bind(productController));
router.patch("variant/disable",authMiddleware, productController.disableVariant.bind(productController));

router.get("/promoter/:productId",authMiddleware, productController.getPromotersByProduct.bind(productController));
router.get("/promoter/:promoterId",authMiddleware, productController.getPromoterById.bind(productController));
router.patch("promoter/disable",authMiddleware, productController.disablePromoter.bind(productController));
router.patch("promoter/modifyStatus",authMiddleware, productController.modifyPromoter.bind(productController));

router.post("/cart",authMiddleware, productController.addToCart.bind(productController));
router.get("/cart/:userId", authMiddleware,productController.getCartByUser.bind(productController));
router.get("/cart/:cartId", authMiddleware,productController.getCartById.bind(productController));
router.patch("/cart",authMiddleware, productController.modifyCart.bind(productController));

router.post("/order",authMiddleware, productController.addOrder.bind(productController));
router.get("/order/:userId",authMiddleware, productController.getByuserId.bind(productController));
router.get("/order/:productId",authMiddleware, productController.getByproductId.bind(productController));
router.get("/order/:orderId",authMiddleware, productController.getOrderById.bind(productController));
router.patch("/order",authMiddleware, productController.modifyOrder.bind(productController));
router.patch("/orderstatus",authMiddleware, productController.modifyOrderstatus.bind(productController));

router.post("/verify",authMiddleware, productController.verify.bind(productController));


//reviews routing
router.post("/review/:productId",  productController.addReview.bind(productController));
router.get("/review/:productId", productController.viewReviewsAndReplies.bind(productController));
router.post("/reply/:commentId", productController.commentReply.bind(productController));
router.delete("/reply/:commentId", productController.deleteReply.bind(productController));




module.exports = router;
