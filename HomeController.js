const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
const { Sequelize } = require("sequelize");
module.exports = {
  homedetail: async (req, res) => {
    try {
      const { latitude, longitude, radius } = req.query;
      let validation = new Validator(req.query, {
        latitude: "required",
        longitude: "required",
        radius: "required",
      });

      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }

      const parking_list = await db.parkings.findAll({
        attributes: [
          "id",
          "user_id",
          "name",
          "location",
          "latitude",
          "longitude",
          "image",
          "status",
          "leaving_min",
          "user_arive_min",
          "arival_date",
          "arival_time",
          "exit_date",
          "exit_time",
          [
            Sequelize.literal(
              `6371 * acos(
                                cos(radians(${latitude})) * 
                                cos(radians(latitude)) * 
                                cos(radians(${longitude}) - radians(longitude)) + 
                                sin(radians(${latitude})) * 
                                sin(radians(latitude))
                            )`
            ),
            "distance",
          ],
          [
            Sequelize.literal(
              `COALESCE((SELECT user_id FROM bookings WHERE bookings.user_id = parkings.user_id AND parkings.status = 1 LIMIT 1), 0)`
            ),
            "bookingid",
          ],
          [
            Sequelize.literal(`
                    (SELECT arival_time FROM arival_time WHERE arival_time.parking_id = parkings.id LIMIT 1)
                `),
            "arival_min",
          ],
        ],
        order: [[Sequelize.literal("distance"), "ASC"]],
        having: Sequelize.literal(`distance <= ${radius}`),
        raw: true,
      });
      return helper.success(res,"Nearby parking list fetched successfully", parking_list
      );
    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      return helper.error500(res, errorMessage);
    }
  },
  updatelocation: async (req, res) => {
    const { user_id, location, latitude, longitude } = req.body;

    try {
        const user = await db.users.findOne({
            where: { id: user_id },
            raw: true,
        });

        if (user) {
            await db.users.update(
                { location, latitude, longitude },
                { where: { id: user_id } }
            );
            const user = await db.users.findOne({
              where: { id: user_id },
              raw: true,
          });
            return res.json({ message: "Location updated successfully" ,user});
        } else {
            return res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("Error in update-location API:", error);
        return res.status(500).json({ message: "An error occurred" });
    }
},
};
