const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
const { Sequelize } = require("sequelize");
module.exports = {
  notificationListing: async (req, res) => {
    try {
     
      
      let validation = new Validator({});
      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      const userId = req.user.id;

      const notificationListing = await db.notifications.findAll({
        attributes: {
          include: [
            [
              Sequelize.literal(
                `(SELECT COUNT(*) FROM notifications WHERE notifications.receiver_id = ${userId} AND is_read = 0)`
              ),
              "msg_count",
            ],
            [
              Sequelize.literal(
                `(SELECT name FROM parkings WHERE parkings.id = notifications.parking_id LIMIT 1)`
              ),
              "parking_name",
            ],
            [
              Sequelize.literal(
                `COALESCE((SELECT user_id FROM bookings WHERE bookings.parking_id = notifications.parking_id AND bookings.status = 1 LIMIT 1), 0)`
              ),
              "bookingid",
            ],
          ],
        },
        
        where: {
          receiver_id: userId,
        },
        include: [
          {
            model: db.users,
            as: "sender_data",
          },
          {
            model: db.users,
            as: "reciever_data",
          },
        ],
        order: [["id", "DESC"]],
      });
      return helper.success(
        res,
        "Notification fetched successfully",
        notificationListing
      );
    } catch (error) {
      const errorMessage =
        error.message || "An Error occur while getting notification .";
      return helper.error500(res, errorMessage);
    }
  },
  
  notification_readstatus: async (req, res) => {
    try {
      let validation = new Validator({});
      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      await db.notifications.update(
        { is_read: 1 },
        {
          where: {
            receiver_id: req.user.id,
          },
        }
      );
      const notifications = await db.notifications.findAll({
        where: {
          receiver_id: req.user.id,
        },
        order: [["id", "DESC"]],
      });

      return helper.success({
        res,
        message: "Read status changed successfully",
        data: notifications,
      });
    } catch (error) {
      const errorMessage = error.message || "An Error occur .";
      return helper.error500(res, errorMessage);
    }
  },
  notificationStatus: async (req, res) => {
    try {
      const validation = new Validator(req.body, {
        is_notification: "required",
      });

      const value = JSON.parse(JSON.stringify(validation));
      const errorResponse = await helper.CheckValidation(validation);

      if (errorResponse) {
        return helper.error400(res, errorResponse);
      }
      await db.users.update(
        { is_notification: req.body.is_notification },
        { where: { id: req.user.id } }
      );

      let detail_user = await db.users.findOne({
        attributes: ["is_notification"],
        where: { id: req.user.id },
      });
      return helper.success(
        res,
        "Notification Status Updated Successfully",
        detail_user
      );
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      return helper.error500(res, errorMessage);
    }
  },
};
