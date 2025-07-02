const db = require('../../models');
const helper = require('../../helper/helper');

db.bookings.belongsTo(db.users, {
  foreignKey: "user_id",
  as: "data"
});
db.bookings.belongsTo(db.vehicles, {
  foreignKey: "vehicle_id",
  as: "vehicless"
});
db.bookings.belongsTo(db.parkings, {
  foreignKey: "parking_id",
  as: "parkingg"
});

module.exports = {

  getBooking: async (req, res) => {
    try {
      
      let data = await db.bookings.findAll({
        include: [
          { model: db.users, as: 'data' },
          { model: db.vehicles, as: 'vehicless' },
          { model: db.parkings, as: 'parkingg' ,
            attribute:['name','location','date','image']
          }
        ], 

      });

      res.render("booking/bookinglist.ejs", {
        title: "Bookings",
        data,
        session: req.session.admin,
      });
    } catch (error) {
      console.log(error);
      return helper.error(res, "Internal server error", error);

    }
  },

  booking_status: async (req, res) => {
    try {
      const result = await db.bookings.update(
        { status: req.body.status },
        { where: { id: req.body.id } }
      );
      if (result[0] === 1) {
        res.json({ success: true });
      } else {
        res.json({ success: false, message: "Status change failed" });
      }
    } catch (error) {
      throw error
    }
  },
  bookingview: async(req,res)=>{
    try {
      const data = await db.bookings.findOne({
        include:[ {
            model:db.users,
            as:"data"
        },
        {model:db.vehicles, as:'vehicless'},
        {model:db.parkings, as:'parkingg'}] ,
        where:{id:req.params.id}});
    
      res.render("booking/bookingview.ejs", {
        title: "Booking Detail",
        data,
        session: req.session.admin,
      });
    } catch (error) {
      console.error("Error view", error);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
},
  booking_delete: async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ success: false, message: "booking ID is required" });
      }
      const booking = await db.bookings.findByPk(req.params.id);
      if (!booking) {
        return res.status(404).json({ success: false, message: "booking not found" });
      }
      await db.bookings.destroy({ where: { id: req.params.id } });

      return res.json({ success: true, message: "product deleted successfully" });
    } catch (error) {
      throw error
    }
  },

}