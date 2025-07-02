const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
const { Sequelize, Op } = require("sequelize");
module.exports = {
  parkinglist: async (req, res) => {
    try {


      const { page, pageSize, latitude, longitude, radius } = req.query;

      let validation = new Validator(req.query, {
        page: "required",
        pageSize: "required",
        latitude: "required",
        longitude: "required",
        radius: "required",
      });

      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }

      const { limit, offset } = await helper.paginate(page, pageSize);
      const parking_list = await db.parkings.findAndCountAll({
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
        where: Sequelize.where(
          Sequelize.literal(
            `6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(latitude)) * 
              cos(radians(${longitude}) - radians(longitude)) + 
              sin(radians(${latitude})) * 
              sin(radians(latitude))
            )`
          ),

          { [Op.lte]: radius }
        ),
        order: [[Sequelize.literal("distance"), "ASC"]],
        limit,
        offset,
      });

      const { rows, count } = parking_list;

      return helper.success(res, "Parking Get successfully", {
        data: rows,
        totalparking: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: Number(page),
      });
    } catch (error) {
      return helper.error500(res, error.message || "An error occurred.");
    }
  },

  parkingdetail: async (req, res) => {
    
    try {
      const { latitude, longitude, radius, id } = req.query;

      const parking_detail = await db.bookings.findOne({
        attributes: [
          "id",
          "user_id",
          "location",
          "latitude",
          "longitude",
          "parking_id",
          "booking_complete",
          "status",
          "leaving_min",
          "user_arive_min",
          "arival_date",
          "arival_time",
          "exit_date",
          "exit_time",
          "requst_accept",
          // [
          //   Sequelize.literal(`
          //       6371 * acos(
          //           cos(radians(${latitude})) * 
          //           cos(radians(bookings.latitude)) * 
          //           cos(radians(${longitude}) - radians(bookings.longitude)) + 
          //           sin(radians(${latitude})) * 
          //           sin(radians(bookings.latitude))
          //       )
          //   `),
          //   "distance",
          // ],
          [
            Sequelize.literal(`
                    (SELECT arival_time FROM arival_time WHERE arival_time.booking_id = bookings.id LIMIT 1)
                `),
            "arival_min",
          ],
        ],
        where: { id },
        include: [
          {
            model: db.parkings,
            as: "parkingdetail",
          },
          {
            model: db.ratings,
            as: "ratingdetail",
            include: [
              {
                model: db.users,
                as: "ratingto",
                attributes: ["id", "name", "image"],
              },
            ],
          },
        ],

        // having: Sequelize.literal(`distance <= ${radius}`),
      });
      return res.status(200).json({
        success: true,
        status: 200,
        message: "Parking details fetched successfully",
        body: parking_detail
      });

      // return helper.success(
      //   res,
      //   "Parking details fetched successfully",
      //   parking_detail
      // );
    } catch (error) {
      console.log(` parking_detail api eerrror `, error);

      return helper.error500(res, error.message || "An error occurred.");
    }
  },



  addparking: async (req, res) => {
    try {

      console.log(`addparking  =-= `, req.body);
      

      const currentTimestamp = new Date().toISOString();

      let validation = new Validator(req.body, {
        arival_time: "required",
        latitude: "required",
        longitude: "required",
        location: "required"
      });

      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }


      let existingBooking = await db.bookings.findOne({
        where: {
          user_id: req.user.id,
          status: 1
        },
        raw: true
      });

      if (existingBooking) {
        return helper.error400(res, "You already have an active booking. Please complete it before adding another parking.");
      }

      let existingParking = await db.parkings.findOne({
        where: {
          user_id: req.user.id,
          latitude: req.body.latitude,
          longitude: req.body.longitude
        },
        raw: true
      });

      if (existingParking) {
        return helper.error400(res, "You have already added parking at this location. Complete your current booking before adding again.");
      }

      // Add new parking
      let parking_add = await db.parkings.create({
        user_id: req.user.id,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        name: req.body.name ,
        location: req.body.location
      });

      // Create booking
      await db.bookings.create({
        parking_id: parking_add.id,
        user_id: req.user.id,
        status: 1,
        booking_complete: 1,
        arival_date: currentTimestamp,
        arival_time: req.body.arival_time,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        location: req.body.location,
      });

      return helper.success(res, "Parking added and booking created successfully.", parking_add);

    } catch (error) {
      const errorMessage = error.message || "An error occurred.";
      return helper.error500(res, errorMessage);
    }
  },


 history: async (req, res) => {
  try {
    const { latitude, longitude, radius, type } = req.query;

    let validation = new Validator(req.body, {});
    let validationError = await helper.CheckValidation(validation);
    if (validationError) {
      return helper.error400(res, validationError);
    }

    const where = {};

   
    if (type == 1) {
      
      where[Sequelize.Op.or] = [
        { user_id: req.user.id },          
        // { requst_accept: 1 }                
      ];
      where.status = 1; 
    } else if (type == 2) {
      
      where[Sequelize.Op.or] = [
        { user_id: req.user.id },
        // { requst_accept: 1 }
      ];
      where.booking_complete = 2; 
    } else {
      
      where.user_id = req.user.id;
    }

    const parking_status = await db.bookings.findAll({
      include: [
        {
          model: db.parkings,
          as: "parkingdetail",
        },
        {
          model: db.ratings,
          as: "ratingdetail",
          include: [
            {
              model: db.users,
              as: "ratingto",
              attributes: ["id", "name", "image"],
            },
          ],
        },
      ],
      attributes: [
        "id",
        "user_id",
        "location",
        "latitude",
        "longitude",
        "parking_id",
        "booking_complete",
        "status",
        "leaving_min",
        "user_arive_min",
        "arival_date",
        "arival_time",
        "exit_date",
        "exit_time",
        "requst_accept",
        [
          Sequelize.literal(`
            6371 * acos(
              cos(radians(${latitude})) * 
              cos(radians(bookings.latitude)) * 
              cos(radians(${longitude}) - radians(bookings.longitude)) + 
              sin(radians(${latitude})) * 
              sin(radians(bookings.latitude))
            )
          `),
          "distance",
        ],
        [
          Sequelize.literal(`
            (SELECT arival_time FROM arival_time WHERE arival_time.booking_id = bookings.id LIMIT 1)
          `),
          "arival_min",
        ],
      ],
      where: where,
      order: [["id", "DESC"]],
      having: Sequelize.literal(`distance <= ${radius}`),
    });

    



    return helper.success(
      res,
      "Parking status retrieved successfully",
      parking_status
    );
  } catch (error) {
    const errorMessage =
      error.message ||
      "An error occurred while retrieving the Parking status.";
    return helper.error500(res, errorMessage);
  }
},

};
