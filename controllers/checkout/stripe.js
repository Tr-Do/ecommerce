const Stripe = require("stripe");
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const {
  buildStripeLineItems,
} = require("../../services/buildStripeLineItems.js");
const Order = require("../../models/order");
const { buildCartOrder } = require("../../services/cartOrder.js");
const { deliverFiles } = require("../../services/fileDelivery.js");

const stripe = new Stripe(STRIPE_KEY);

module.exports.createSession = async (req, res, next) => {
  try {
    const baseUrl = (process.env.BASE_URL || "").trim();
    if (!/^https?:\/\/[^ "]+$/i.test(baseUrl)) {
      throw new Error(`BASE_URL invalid at runtime: "${process.env.BASE_URL}"`);
    }
    const successUrl = new URL(
      "/checkout/success?session_id={CHECKOUT_SESSION_ID}",
      baseUrl,
    ).toString();
    const cancelUrl = new URL("/cart", baseUrl).toString();

    const { orderItems, amountTotalCents, currency } =
      await buildCartOrder(req);

    const line_items = buildStripeLineItems(orderItems);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    const order = await Order.create({
      ip: req.ip,
      user: req.user ? req.user._id : null,
      items: orderItems,
      payment: {
        provider: "stripe",
        status: "pending",
        stripeSessionId: session.id,
        currency,
        amountCharged: null,
        paymentIntentId: null,
        paidAt: null,
        attemptedAt: new Date(),
        emailSentAt: null,
        card: {
          brand: null,
          last4: null,
        },
        amountTotal: amountTotalCents,
      },
      email: null,
    });

    req.session.lastOrderId = order._id;
    return res.redirect(303, session.url);
  } catch (err) {
    return next(err);
  }
};

module.exports.webhook = async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook signature failed`);
  }

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  try {
    const session = event.data.object; // checkout.session
    if (session.payment_status !== "paid") return res.json({ received: true });

    const order = await Order.findOne({
      "payment.stripeSessionId": session.id,
    });
    if (!order || order.payment?.status === "paid")
      return res.json({ received: true });

    if (
      typeof session.amount_total === "number" &&
      session.amount_total !== order.payment.amountTotal
    )
      return res.status(400).json({ error: "Amount mismatch" });

    order.payment.status = "paid";
    order.payment.amountCharged = session.amount_total ?? null;
    order.payment.currency = session.currency ?? "usd";
    order.payment.paymentIntentId = session.payment_intent ?? null;
    order.payment.paidAt = new Date();

    // fetch payment from the latest charge to extract card information and store it to DB
    if (session.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ["latest_charge"],
      });
      const card = pi.latest_charge?.payment_method_details?.card;

      order.payment.card = {
        brand: card?.brand ?? null,
        last4: card?.last4 ?? null,
      };
    }

    order.email = session.customer_details?.email || order.email;
    await order.save();
    await deliverFiles(order._id);
    return res.json({ received: true });
  } catch (err) {
    return res.status(500).json({ received: false });
  }
};

module.exports.paymentConfirmation = async (req, res, next) => {
  try {
    const sessionId = req.query.session_id;

    if (!sessionId) {
      req.flash("error", "Something went wrong");
      // display flash on order confimation page
      res.locals.error = req.flash("error");
      return res.redirect("/products");
    }

    const order = await Order.findOne({ "payment.stripeSessionId": sessionId });

    if (!order) {
      req.flash("error", "Order not found");
      res.locals.error = req.flash("error");
      return res.redirect("/cart");
    }
    if (order?.payment?.status === "paid") {
      req.flash("success", "Payment completed.");
      res.locals.success = req.flash("success");

      // reset cart count after payment confirmation
      req.session.cart = { items: [] };
      delete req.session.lastOrderId;
      res.locals.cartCount = 0;
    } else {
      req.flash("info", "Payment processing...");
    }

    return res.render("orders/index", { order, sessionId });
  } catch (err) {
    return next(err);
  }
};
