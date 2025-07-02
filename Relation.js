const db = require("../models");
module.exports = {
  dbrelation: async () => {
    db.users.hasOne(db.vehicles, {
      foreignKey: "user_id",
      as: "userVehicles",
    });
    db.notifications.belongsTo(db.users, {
      foreignKey: "receiver_id",
      as: "reciever_data",
    });

    db.notifications.belongsTo(db.users, {
      foreignKey: "sender_id",
      as: "sender_data",
    });
    db.ratings.belongsTo(db.users, {
      foreignKey: "user_id",
      as: "ratingby",
    });
    db.ratings.belongsTo(db.users, {
      foreignKey: "ratinguser_id",
      as: "ratingto",
    });

    db.bookings.belongsTo(db.parkings, {
      foreignKey: "parking_id",
      as: "parkingdetail",
    });
    db.parkings.hasOne(db.bookings, {
      foreignKey: "parking_id",
      as: "bookingdetail",
      order: [["id", "DESC"]],
    });
    db.bookings.hasOne(db.ratings, {
      foreignKey: "booking_id",
      as: "ratingdetail",
    });
  },
};
