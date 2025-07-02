const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
var cron = require("node-cron");
const { Sequelize, Op, where } = require("sequelize");
const options = { timeZone: "UTC", hour12: false };

const moment = require("moment-timezone");
const { raw } = require("body-parser");
const { success } = require("toastr");


const ongoing_user_parking = async (req) => {
  try {

    console.log(`ongoing_user_parking =-=- req  `, req);

    const { latitude, longitude, radius } = req;

    const user_details = await db.users.findOne({
      where: {
        id: req.user.id
      },
      raw: true
    })

    console.log(` user_details  =-=- `, user_details);

    console.log(` user_details && user_details.socket_id &&
      user_details.socket_id != "" && user_details.socket_id != null -=- `,
      user_details && user_details.socket_id &&
      user_details.socket_id != "" && user_details.socket_id != null
    );

    if (user_details && user_details.socket_id &&
      user_details.socket_id != "" && user_details.socket_id != null) {

      let where = {
        user_id: req.user.id
      };
      where.status = 1;

      console.log(` ongoing_user_parking where  =-=- `, where);

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
                attributes: ["id", "name", "image", "socket_id"],
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

      console.log(` parking_status  =-=-= `, parking_status);

      let obj_send = {
        status: true,
        data: parking_status,
        message: "Parking status retrieved successfully"
      }

      console.log(`parking_status.length  `, parking_status.length);

      if (parking_status.length) {
        console.log(`send socket `, user_details.socket_id, ` user_details =-=- `, user_details);

        global.io.to(user_details.socket_id).emit('ongoing_parking', obj_send)
      }

    } else {
      console.log(`user socket id not present , so no socket send`);
    }

  } catch (error) {
    console.log(` error in ongoin_user parking =-=-= `, error);
    return { status: false, message: error }
  }
}

const vacantspotByCron = async (req, res) => {
  try {
    console.log(` vacantspotByCron  req.body `, req.body);

    const currentTimestamp = new Date().toISOString();

    const existingBooking = await db.bookings.findOne({
      where: {
        parking_id: req.body.id,
        status: 1
      },
      raw: true
    });

    console.log(`vacantspotByCron existingBooking =-=-=- `, existingBooking);

    if (existingBooking) {
      return ({ success: false, message: "This parking spot is already booked.", });
    }

    // Check if user already has an active booking
    const userBooking = await db.bookings.findOne({
      where: {
        user_id: req.user.id,
        status: 1,
      },
      raw: true
    });

    console.log(`vacantspotByCron userBooking `, userBooking);

    if (userBooking) {
      return ({ success: false, message: "You have already booked a parking spot.", });
    }

    // Update parking spot status
    await db.parkings.update(
      {
        status: 1,
        parkingcomplete: 1,
      },
      { where: { id: req.body.id } }
    );

    // Fetch the updated parking spot to get lat/lng
    let updatedSpot = await db.parkings.findOne({
      where: { id: req.body.id },
      raw: true,
    });

    // Create booking with lat/lng from parking table
    let booking_created = await db.bookings.create({
      parking_id: req.body.id,
      user_id: req.user.id,
      status: 1,
      booking_complete: 1,
      arival_date: currentTimestamp,
      arival_time: req.body.arival_time,
      latitude: updatedSpot.latitude,
      longitude: updatedSpot.longitude,
      location: updatedSpot.location
    });

    console.log(` booking_created =-=-= `, booking_created);


    // history data send

    let send_obj = {
      user: {
        id: req.user.id
      },
      latitude: updatedSpot.latitude,
      longitude: updatedSpot.longitude,
      radius: 10
    }
    console.log(` send_obj  `, send_obj);


    ongoing_user_parking(send_obj)

 
  } catch (error) {
    console.log(`vacantspotByCron vacantspot -=-=- `, error);
    return { success: false, error: error }
  }
}

cron.schedule("* * * * *", async () => {
  try {
    const findparking = await db.parkings.findAll({
      where: {
        status: 1,
        parkingcomplete: [0, 1],
        leaving_min: { [Op.gte]: 1 },
        // requst_accept: 1,
      },
      raw: true,
      order: [["id", "DESC"]],
    });

    console.log(` findparking `, findparking);

    for (let index = 0; index < findparking.length; index++) {

      const parkingId = findparking[index].id;
      const leaving_min = parseInt(findparking[index].leaving_min, 10);
      const exit_date = new Date(findparking[index].exit_date);
      exit_date.setMinutes(exit_date.getMinutes() + leaving_min);
      const exit_time = exit_date.toLocaleString("en-US", options);
      console.log(exit_time, "ooooooo");

      let current_time = new Date().toLocaleString("en-US", options);

      if (current_time >= exit_time && exit_time) {
        let parking_update = {
          leaving_min: 0,
          status: 0,
          parkingcomplete: 2,
          exit_time: 0,
          exit_date: 0,
        };
        let parkingUpdated = await db.parkings.update(parking_update, {
          where: { id: parkingId },
        });

        let newBooking = await db.bookings.findOne({
          where: { parking_id: parkingId, booking_complete: 1 },
          raw: true,
          orderBy: [["id", "desc"]],
        });

        if (newBooking) {

          console.log(` newBooking  -=-=-=-=-=- `, newBooking);

          let booking_update = {
            leaving_min,
            status: 0,
            booking_complete: 2,
            exit_time: exit_time,
            exit_date: current_time,
          };
          let booking_Updated = await db.bookings.update(booking_update, {
            where: { id: newBooking.id },
          });

          ///////////////////////////////////////////////////////////////////



          let arrival_time_data = await db.arival_time.findOne({
            where: { booking_id: newBooking.id, status: 1 },
            raw: true
          });

          console.log(`arrival_time_data cron `, arrival_time_data);
          console.log(`parkingId `, parkingId);

          if (arrival_time_data) {

            let obj = {
              body: {
                arival_time: arrival_time_data.user_id,
                id: parkingId
              },
              user: {
                id: arrival_time_data.user_id
              }
            }

            vacantspotByCron(obj, {})

            let arrival_time_update = await db.arival_time.update({
              status: 3
            }, {
              where: { id: newBooking.id, status: 1 }
            });

            console.log(`  arrival_time_update `, arrival_time_update);


          }

          console.log(`booking_Updated =-=- `, booking_Updated);
        }
      }
    }
  } catch (error) {
    console.error("Cron Job Error:", error);
  }
}),


  (module.exports = {
    addbooking: async (req, res) => {
      try {
        console.log(req.body);
        const currentTimestamp = req.body.currenttimestamp
          ? new Date(req.body.currenttimestamp).toISOString()
          : new Date().toISOString();
        let validation = new Validator(req.body, {
          start_time: "required",
        });
        let validationError = await helper.CheckValidation(validation);
        if (validationError) {
          return helper.error400(res, validationError);
        }
        const vehicle = await db.vehicles.findOne({
          where: { user_id: req.user.id },
          raw: true,
        });
        const parking = await db.parkings.findOne({
          where: { user_id: req.user.id },
          raw: true,
        });

        const booking = await db.bookings.create({
          user_id: req.user.id,
          start_time: req.body.start_time,
          vehicle_id: vehicle.id,
          parking_id: parking.id,
          arival_date: currentTimestamp,
        });
        return helper.success(res, "Booking added successfully", booking);
      } catch (error) {
        return helper.error500(res, error.message || "An error occurred.");
      }
    },

    leavingspot_new: async (req, res) => {
      try {
        const { latitude, longitude, radius, leaving_min, id } = req.body;

        const whereCondition = {
          [Op.and]: [
            Sequelize.literal(`
              6371 * acos(
                  cos(radians(${latitude})) * cos(radians(latitude)) *
                  cos(radians(${longitude}) - radians(longitude)) +
                  sin(radians(${latitude})) * sin(radians(latitude))
              ) <= ${radius}
            `),
            { device_type: { [Op.in]: [1, 2] } },
          ],
        };

        const nearbyUsers = await db.users.findAll({
          attributes: ["id", "name", "device_token", "device_type", "is_notification"],
          where: whereCondition,
          raw: true,
        });

        const currentdate = new Date();
        const datetime =
          currentdate.getMonth() +
          1 +
          "/" +
          currentdate.getDate() +
          "/" +
          currentdate.getFullYear() +
          "," +
          currentdate.getHours() +
          ":" +
          currentdate.getMinutes() +
          ":" +
          currentdate.getSeconds();

        await db.parkings.update(
          {
            leaving_min,
            exit_time: datetime,
            exit_date: datetime,
            requst_accept: 0,
          },
          { where: { id } }
        );

        const newBooking = await db.bookings.findOne({
          where: { parking_id: id, booking_complete: 1 },
          order: [["id", "desc"]],
          raw: true,
        });

        await db.bookings.update(
          {
            leaving_min,
            exit_time: datetime,
            exit_date: datetime,
            requst_accept: 0,
          },
          { where: { id: newBooking.id } }
        );

        const updatedSpot = await db.parkings.findOne({ where: { id } });
        const parkingName = updatedSpot ? updatedSpot.name : "";

        //////////////////////////////////////////////Push Notification/////////////////////////////////////////////

        const senderId = Number(req.user?.id);
        console.log("Logged-in sender ID:", senderId);

        if (!senderId || isNaN(senderId)) {
          console.log("Invalid sender ID");
          return helper.error500(res, "Unauthorized or invalid user.");
        }

        const findSender = await db.users.findOne({
          where: { id: senderId },
          raw: true,
        });

        for (let user of nearbyUsers) {
          console.log(`Checking user ${user.id}, is_notification: ${user.is_notification}`);

          if (user.is_notification === 1 && Number(user.id) !== senderId) {
            console.log(`Sending notification to user ${user.id}`);

            const msg = `${findSender.name} has emptied the spot: ${parkingName}`;
            const notificationType = 2;

            await db.notifications.create({
              sender_id: senderId,
              receiver_id: user.id,
              parking_id: id,
              booking_id: newBooking.id,
              message: msg,
              arival_time_id: 0,
            });

            const notiData = {
              title: "Courtesy",
              message: msg,
              deviceToken: user.device_token,
              deviceType: user.device_type,
              Receiver_name: user.name,
              type: notificationType,
              senderId: senderId,
              receiver_id: user.id,
              sender_name: findSender.name,
              parkingName: parkingName,
              parkingid: id,
              booking_id: newBooking.id,
            };

            await helper.sendNotification(user.device_token, notiData);
          } else {
            console.log(`Skipping user ${user.id} (self or notifications off)`);
          }
        }

        ///////////////////////////////////////////Push Notification End////////////////////////////////////

        return helper.success(res, "Leaving Time Added Successfully", updatedSpot);
      } catch (error) {
        console.log(error);
        return helper.error500(res, error.message || "An error occurred.");
      }
    },

    // vacantspotByCron: async (req, res) => {
    //   try {
    //     console.log(` vacantspot `, req.body);

    //     const currentTimestamp = new Date().toISOString();

    //     const existingBooking = await db.bookings.findOne({
    //       where: {
    //         parking_id: req.body.id,
    //         status: 1
    //       },
    //       raw: true
    //     });

    //     console.log(` existingBooking =-=-=- `, existingBooking);

    //     if (existingBooking) {
    //       return helper.error400(res, "This parking spot is already booked.");
    //     }

    //     // Check if user already has an active booking
    //     const userBooking = await db.bookings.findOne({
    //       where: {
    //         user_id: req.user.id,
    //         status: 1,
    //       },
    //       raw: true
    //     });

    //     console.log(` userBooking `, userBooking);

    //     if (userBooking) {
    //       return helper.error400(res, "You have already booked a parking spot.");
    //     }

    //     // Update parking spot status
    //     await db.parkings.update(
    //       {
    //         status: 1,
    //         parkingcomplete: 1,
    //       },
    //       { where: { id: req.body.id } }
    //     );

    //     // Fetch the updated parking spot to get lat/lng
    //     let updatedSpot = await db.parkings.findOne({
    //       where: { id: req.body.id },
    //       raw: true,
    //     });

    //     // Create booking with lat/lng from parking table
    //     await db.bookings.create({
    //       parking_id: req.body.id,
    //       user_id: req.user.id,
    //       status: 1,
    //       booking_complete: 1,
    //       arival_date: currentTimestamp,
    //       arival_time: req.body.arival_time,
    //       latitude: updatedSpot.latitude,     
    //       longitude: updatedSpot.longitude,
    //       location: updatedSpot.location     
    //     });
    //     return { success: true, error: error}
    //     //return helper.success(res, "Status updated Successfully", updatedSpot);
    //   } catch (error) {
    //     console.log(` vacantspot -=-=- `, error);

    //     return { success: false, error: error}
    //     //return helper.error500(res, error.message || "An error occurred.");
    //   }
    // },

    vacantspot: async (req, res) => {
      try {
        console.log(` vacantspot `, req.body);

        const currentTimestamp = new Date().toISOString();

        const existingBooking = await db.bookings.findOne({
          where: {
            parking_id: req.body.id,
            status: 1
          },
          raw: true
        });

        console.log(` existingBooking =-=-=- `, existingBooking);

        if (existingBooking) {
          return helper.error400(res, "This parking spot is already booked.");
        }

        // Check if user already has an active booking
        const userBooking = await db.bookings.findOne({
          where: {
            user_id: req.user.id,
            status: 1,
          },
          raw: true
        });

        console.log(` userBooking `, userBooking);

        if (userBooking) {
          return helper.error400(res, "You have already booked a parking spot.");
        }

        // Update parking spot status
        await db.parkings.update(
          {
            status: 1,
            parkingcomplete: 1,
          },
          { where: { id: req.body.id } }
        );

        // Fetch the updated parking spot to get lat/lng
        let updatedSpot = await db.parkings.findOne({
          where: { id: req.body.id },
          raw: true,
        });

        console.log(` updatedSpot `, updatedSpot);


        // Create booking with lat/lng from parking table
        await db.bookings.create({
          parking_id: req.body.id,
          user_id: req.user.id,
          status: 1,
          booking_complete: 1,
          arival_date: currentTimestamp,
          arival_time: req.body.arival_time,
          latitude: updatedSpot.latitude,
          longitude: updatedSpot.longitude,
          location: updatedSpot.location
        });

        return helper.success(res, "Status updated Successfully", updatedSpot);
      } catch (error) {
        console.log(` vacantspot api -=-=- `, error);
        return helper.error500(res, error.message || "An error occurred.");
      }
    },


    acceptwaiting: async (req, res) => {
      try {
        const booking_data = await db.bookings.findOne({
          where: {
            id: req.body.id,
          },
          raw: true,
        });
        const updatedTime = new Date(booking_data.exit_date);
        updatedTime.setMinutes(
          updatedTime.getMinutes() + parseInt(booking_data.user_arive_min)
        );
        const updatedTimeUTC = updatedTime.toISOString();
        let updated_data = await db.parkings.update(
          {
            exit_date: updatedTimeUTC,
            requst_accept: 0,
          },
          { where: { id: booking_data.parking_id } }
        );
        let updated_bookings = await db.bookings.update(
          {
            exit_date: updatedTimeUTC,
            requst_accept: 0,
          },
          { where: { parking_id: req.body.id } }
        );

        let updatedSpot = await db.bookings.findOne({
          where: { id: req.body.id },
          raw: true,
        });
        return helper.success(res, "Accepted By User", updatedSpot);
      } catch (error) {
        console.error(`Error in acceptwaiting:`, error);
        return helper.error500(res, error.message || "An error occurred.");
      }
    },

    acceptReject: async (req, res) => {
      console.log(req.body, "acepreject");

      try {
        let arival_time = await db.arival_time.findOne({
          where: { id: req.body.arival_time_id },
          raw: true,
        });

        arival_time.status = req.body.status;

        if (arival_time && req.body.status == 1) {
          // Existing accept logic remains same...
          const booking_data = await db.bookings.findOne({
            where: { id: arival_time.booking_id },
            raw: true,
          });

          await db.notifications.destroy({
            where: {
              receiver_id: { [Op.ne]: req.body.user_id },
              arival_time_id: { [Op.ne]: req.body.arival_time_id },
              booking_id: arival_time.booking_id,
            },
          });

          const updatedTime = new Date(booking_data.exit_time);
          updatedTime.setMinutes(
            updatedTime.getMinutes() + parseInt(arival_time.arival_time)
          );
          const updatedTimeUTC = updatedTime.toISOString();

          await db.parkings.update(
            { requst_accept: 1 },
            { where: { id: arival_time.parking_id } }
          );
          await db.bookings.update(
            { requst_accept: 1 },
            { where: { id: arival_time.booking_id } }
          );

          await db.arival_time.update(
            { status: req.body.status },
            {
              where: { id: req.body.arival_time_id },
              raw: true,
            }
          );

          const findSender = await db.users.findOne({
            where: { id: req.user.id },
            raw: true,
          });

          const findReceiver = await db.users.findOne({
            where: { id: arival_time.user_id },
            raw: true,
          });

          const msg = `${findSender.name} has accepted your request for parking, please reach the spot`;
          const notificationType = 5;

          await db.notifications.create({
            sender_id: req.user.id,
            receiver_id: arival_time.user_id,
            parking_id: arival_time.parking_id,
            booking_id: arival_time.booking_id,
            arival_time_id: arival_time.id,
            message: msg,
            type: notificationType,
          });

          if (findReceiver && findReceiver.is_notification === 1) {
            const notiData = {
              title: "Courtesy",
              message: msg,
              deviceToken: findReceiver.device_token,
              deviceType: findReceiver.device_type,
              Receiver_name: findReceiver.name,
              Receiver_image: findReceiver.image,
              type: notificationType,
              senderId: findSender.id,
              receiver_id: arival_time.user_id,
              user2_Id: findReceiver.id,
              sender_name: findSender.name,
              sender_image: findSender.image,
              parking_id: arival_time.parking_id,
              booking_id: arival_time.booking_id,
            };
            await helper.sendNotification(findReceiver.device_token, notiData);
          }

          return helper.success(
            res,
            "Booking status updated successfully",
            arival_time
          );

        } else {
          // === REJECT LOGIC STARTS HERE ===
          await db.arival_time.update(
            { status: 2 },
            {
              where: { id: req.body.arival_time_id },
              raw: true,
            }
          );

          arival_time.status = 2


          const findReceiver = await db.users.findOne({
            where: { id: arival_time.user_id },
            raw: true,
          });

          const findSender = await db.users.findOne({
            where: { id: req.user.id },
            raw: true,
          });

          const rejectMsg = `${findSender.name} has rejected your parking request.`;
          const rejectType = 6;

          await db.notifications.create({
            sender_id: req.user.id,
            receiver_id: arival_time.user_id,
            parking_id: arival_time.parking_id,
            booking_id: arival_time.booking_id,
            arival_time_id: arival_time.id,
            message: rejectMsg,
            type: rejectType,
          });

          if (findReceiver && findReceiver.is_notification === 1) {
            const notiData = {
              title: "Parking Request Rejected",
              message: rejectMsg,
              deviceToken: findReceiver.device_token,
              deviceType: findReceiver.device_type,
              Receiver_name: findReceiver.name,
              Receiver_image: findReceiver.image,
              type: rejectType,
              senderId: findSender.id,
              receiver_id: arival_time.user_id,
              user2_Id: findReceiver.id,
              sender_name: findSender.name,
              sender_image: findSender.image,
              parking_id: arival_time.parking_id,
              booking_id: arival_time.booking_id,
            };
            await helper.sendNotification(findReceiver.device_token, notiData);
          }

          const parkingData = await db.parkings.findOne({
            where: { id: arival_time.parking_id },
            raw: true,
          });


          const nearbyUsers = await db.users.findAll({
            where: {
              id: {
                [Op.and]: [
                  { [Op.ne]: arival_time.user_id },
                  { [Op.ne]: req.user.id },
                ],
              },
              is_notification: 1,
              device_token: { [Op.ne]: null },
              device_type: { [Op.ne]: null },
            },
            raw: true,
          });

          const availableMsg = `A parking spot near you is now available !`;

          for (const user of nearbyUsers) {
            const notifyData = {
              title: "Parking Available",
              message: availableMsg,
              deviceToken: user.device_token,
              deviceType: user.device_type,
              Receiver_name: user.name,
              Receiver_image: user.image,
              type: 7,
              senderId: req.user.id,
              receiver_id: user.id,
              parking_id: parkingData.id,
            };

            await helper.sendNotification(user.device_token, notifyData);

            await db.notifications.create({
              sender_id: req.user.id,
              receiver_id: user.id,
              parking_id: parkingData.id,
              booking_id: arival_time.booking_id,
              arival_time_id: arival_time.id,
              message: availableMsg,
              type: 7,
            });
          }

          return helper.success(
            res,
            "Booking status updated successfully",
            arival_time
          );
        }
      } catch (error) {
        console.error(`Error in acceptReject:`, error);
        return helper.error500(res, error.message || "An error occurred.");
      }
    },

    arrivaltime: async (req, res) => {
      try {
        let arival_time = await db.arival_time.create({
          user_id: req.user.id,
          booking_id: req.body.booking_id,
          parking_id: req.body.parking_id,
          arival_time: req.body.arival_time,
          status: 0,
        });
        let ariving_data = await db.arival_time.findOne({
          where: {
            id: arival_time.id,
          },
        });
        let bookingData = await db.bookings.findOne({
          where: { id: req.body.booking_id },
          raw: true,
        });
        //////////////////////////////////////////////////////////////pushnotification////////////////////////////////////
        const findSender = await db.users.findOne({
          where: { id: req.user.id },
          raw: true,
        });

        const findReceiver = await db.users.findOne({
          where: { id: bookingData.user_id },
          raw: true,
        });

        const msg = `${findSender.name} I will arivng this spot in :${req.body.arival_time} min`;
        const notificationType = 4;

        let data = await db.notifications.create({
          sender_id: req.user.id,
          receiver_id: bookingData.user_id,
          parking_id: req.body.parking_id,
          booking_id: req.body.booking_id,
          arival_time_id: arival_time.id,
          message: msg,
          type: notificationType,
        });
        if (findReceiver && findReceiver.is_notification === 1) {
          const notiData = {
            title: "Courtesy",
            message: msg,
            deviceToken: findReceiver.device_token,
            deviceType: findReceiver.device_type,
            Receiver_name: findReceiver.name,
            Receiver_image: findReceiver.image,
            type: notificationType,
            senderId: findSender.id,
            user2_Id: findReceiver.id,
            sender_name: findSender.name,
            sender_image: findSender.image,
          };
          await helper.sendNotification(findReceiver.device_token, notiData);
        }
        //////////////////////////////////////////////////////////pushnotification//////////////////////////////////////
        return helper.success(
          res,
          "Arriving time added Successfully",
          ariving_data
        );
      } catch (error) {
        console.log(`error  in arrving api`, error);

        return helper.error500(res, error.message || "An error occurred.");
      }
    },

    scheduler: async (req, res) => {
      try {
        const findparking = await db.parkings.findAll({
          where: {
            status: 1,
            parkingcomplete: [0, 1],
          },
          raw: true,
          order: [["id", "DESC"]],
        });

        for (let index = 0; index < findparking.length; index++) {
          const parkingId = findparking[index].id;
          const leaving_min = parseInt(findparking[index].leaving_min, 10);
          const exit_date = new Date(findparking[index].exit_date);
          exit_date.setMinutes(exit_date.getMinutes() + leaving_min);
          const exit_time = exit_date.toLocaleString("en-US", options);

          if (exit_time >= current_time) {
            await db.parkings.update(
              {
                leaving_min: 0,
                status: 0,
                parkingcomplete: 2,
                exit_time: 0,
                exit_date: 0,
              },
              { where: { id: parkingId } }
            );

            let newBooking = await db.bookings.findOne({
              where: { parking_id: parkingId, booking_complete: 1 },
              raw: true,
              orderBy: [["id", "desc"]],
            });

            if (newBooking) {
              await db.bookings.update(
                {
                  leaving_min,
                  status: 0,
                  booking_complete: 2,
                  exit_time: exit_time,
                  exit_date: current_time,
                },
                { where: { id: newBooking.id } }
              );
              console.log("Booking updated successfully!");
            }
          }
        }
      } catch (error) {
        console.error("Cron Job Error:", error);
      }
    },
  });
