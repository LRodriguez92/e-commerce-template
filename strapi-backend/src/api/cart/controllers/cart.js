'use strict';

/**
 * cart controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::cart.cart', ({ strapi }) => ({
    async checkout(ctx) {
        const { cartId, userId } = ctx.request.body;

        // Find the cart
        const cart = await strapi.entityService.findOne('api::cart.cart', cartId, {
            populate: ['cart_products', 'cart_products.product']
        });

        if (!cart || cart.status !== 'active') {
            return ctx.throw(400, 'Invalid cart');
        }

        if (cart.users_permissions_user.id !== userId) {
            return ctx.throw(403, 'You do not have permission to access this cart');
        }

        // Calculate total and check stock
        let total = 0;
        const updates = cart.cart_products.map(async cartProduct => {
            const product = cartProduct.product;
            if (product.stock < cartProduct.quantity) {
                throw new Error(`Not enough stock for product ${product.name}`);
            }
            total += product.price * cartProduct.quantity;

            // Deduct stock
            await strapi.entityService.update('api::product.product', product.id, {
                data: { stock: product.stock - cartProduct.quantity }
            });
        });

        try {
            await Promise.all(updates);
        } catch (error) {
            return ctx.throw(400, error.message);
        }

        // Create an order
        const order = await strapi.entityService.create('api::order.order', {
            data: {
                user: userId,
                cart_products: cart.cart_products.map(cp => cp.id),
                total,
                status: 'pending'
            }
        });

        // Update cart status to checked-out
        await strapi.entityService.update('api::cart.cart', cartId, {
            data: { status: 'checked-out', total }
        });

        // Process payment (pseudo-code, implement your payment logic here)
        // const paymentResult = await processPayment(userId, total);
        // if (!paymentResult.success) {
        //   return ctx.throw(400, 'Payment failed');
        // }

        // Update order status to completed
        await strapi.entityService.update('api::order.order', order.id, {
            data: { status: 'completed' }
        });

        return ctx.send({ message: 'Checkout complete', order });
    }
}));