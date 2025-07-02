const db = require("../models");
const helper = require("../helper/helper");
const { bookings } = require("../models");

module.exports = function (io) {
 
  io.on("connection", function (socket) {

    socket.on("disconnect", async function () {
    
      try {

        let user_data = await db.users.findOne({
          where: {
            socket_id: socket.id
          },
          raw:true
        })

        console.log(`  user_data   =-=-=- `, user_data);
        

        await db.users.update(
          { socket_id: "" },
          { where: { socket_id: socket.id } }
        );
        console.log("Socket ID cleared from DB");
      } catch (err) {
        console.error("Error clearing socket_id:", err);
      }
    });

    socket.on("connect_user", async (connect_listener) => {
      try {
        const user = await db.users.findOne({
          where: { id: connect_listener.user_id },
          raw: true,
        });

        console.log(`connect_user c+_+_+_user connect_user user `, user.email);

        let response_message;
        if (user) {
          await db.users.update(
            { socket_id: socket.id },
            { where: { id: connect_listener.user_id } }
          );
          response_message = { message: "Connected successfully" };
        } else {
          response_message = { message: "User not found" };

        }

        socket.emit("connect_user", response_message);
      } catch (error) {
        console.error("Error in connect_user:", error);
        socket.emit("connect_user", { message: "An error occurred" });
      }
    });

    socket.on("update_location", async (update_listener) => {
      try {
        const user = await db.users.findOne({
          where: { id: update_listener.user_id },
          raw: true,
        });

        let response_message;
        if (user) {
          await db.users.update(
            {
              location: update_listener.location,
              latitude: update_listener.latitude,
              longitude: update_listener.longitude,
            },
            { where: { id: update_listener.user_id } }
          );
          response_message = { message: "Location updated successfully" };
        } else {
          response_message = { message: "User not found" };
        }

        socket.emit("update_location", response_message);
      } catch (error) {
        console.error("Error in update_location:", error);
        socket.emit("update_location", { message: "An error occurred" });
      }
    });
    socket.on("update_booking", async (data) => {
      try {
        const currentTimestamp = data.currenttimestamp
          ? new Date(data.currenttimestamp).toISOString()
          : new Date().toISOString();
        const user = await db.bookings.findOne({
          where: { user_id: data.user_id },
          raw: true,
        });
        let response_message;
        if (user) {
          await db.bookings.update(
            {
              exit_time: data.exit_time,
              status: data.status,
              exit_date: currentTimestamp,
            },
            { where: { user_id: data.user_id } }
          );
          const updatedata = await db.bookings.findOne({
            where: { user_id: data.user_id },
          });
          response_message = {
            message: "Booking updated successfully",
            currenttimestamp: currentTimestamp,
            user: updatedata,
          };
        } else {
          response_message = { message: "User not found" };
        }

        socket.emit("update_booking", response_message);
      } catch (error) {
        console.error("Error in update_booking:", error);
        socket.emit("update_booking", { message: "An error occurred" });
      }
    });
  });
};
