const { Validator } = require("node-input-validator");
const db = require("../../models");
var helper = require("../../helper/helper");
module.exports = {
  addrating: async (req, res) => {
    try {
      let validation = new Validator(req.body, {});
      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      let rating = await db.ratings.create({
        user_id: req.user.id,
        booking_id: req.body.booking_id,
        rating: req.body.rating,
        ratinguser_id: req.body.ratinguser_id,
        review: req.body.review,
      });
      return helper.success(res, "Rating Added successfully", rating);
    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      return helper.error500(res, errorMessage);
    }
  },
  ratinglist: async (req, res) => {
    try {
      let rating_list = await db.ratings.findAll({
        include: [
          {
            model: db.users,
            as: "ratingby",
          },
          {
            model: db.users,
            as: "ratingto",
          },
        ],
        where: { user_id: req.user.id },
        order: [["id", "DESC"]],
      });
      return helper.success(res, "Rating get successfully", rating_list);
    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      return helper.error500(res, errorMessage);
    }
  },
};
