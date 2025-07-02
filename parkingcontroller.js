const db = require('../../models');
const helper = require('../../helper/helper');
db.parkings.belongsTo(db.users, {
  foreignKey: "user_id",
  
});
module.exports = {
  addparking: async (req, res) => {
    try {
      if (req.files && req.files.image) {
        const imagePath = await helper.fileUpload(req.files.image);
        req.body.image = imagePath;
      };
      const data = await db.parkings.create({
        name: req.body.name,
        location: req.body.location,
        latitude: req.body.latitude,
        longitude:req.body.longitude,
        image: req.body.image,
      });
      req.flash('success', 'vehicle added successfully');
      res.redirect('/parkinglist')
    } catch (error) {
      throw error
    }
  },
  parkinglist: async (req, res) => {
    try {
      const data = await db.parkings.findAll({
        order: [['id', 'DESC']], 
        raw: true,
      });
  
      res.render("parking/parkinglist.ejs", {
        title: "Parking Slots",
        data,
        session: req.session.admin,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },
  
  parking_status: async (req, res) => {
    try {
      const result = await db.parkings.update(
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
  viewparking: async (req, res) => {
    try {
      let view = await db.parkings.findOne({
        where: { id: req.params.id },
        include: [{
          model: db.users
        }],
     
      });
  
  
      res.render("parking/parkingview.ejs", {
        session: req.session.admin,
        view,
        title: 'Parking Slot Detail',
      });
    } catch (error) {
      throw error;
    }
  },
  
  parking_delete: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await db.parkings.findByPk(userId);
      await db.parkings.destroy({ where: { id: userId } });
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      throw error
    }
  },
  parking: async (req, res) => {
    try {
      res.render('parking/parkingadd.ejs', {
        session: req.session.admin,
        title: "Add Parking",
      });
    } catch (error) {
      throw error
    }
  },
  parkingedit: async (req, res) => {
    try {
      const parking = await db.parkings.findOne({ where: { id: req.params.id } });
      if (!parking) {
        return req.flash('error', 'Parking not found');
      }

      res.render('parking/parkingedit', {
        session: req.session.admin,
        title: 'Edit Parking',
        parking,
      });
    } catch (error) {
      console.error("Error fetching parking for edit:", error);
      req.flash('error', 'Internal server error');
      res.redirect('/parkinglist');
    }
  },
  updateparking: async (req, res) => {
    try {
      const parking = await db.parkings.findOne({ where: { id: req.params.id } });
      if (req.files && req.files.image) {
        let images = await helper.fileUpload(req.files.image);
        req.body.image = images;
      } else {
        req.body.image = parking.image; 
      }
      await db.parkings.update({
        name: req.body.name,
        location: req.body.location,
        image: req.body.image,
      
      }, {
        where: { id: req.params.id }
      });

      req.flash("success", "Parking updated successfully");
      res.redirect("/parkinglist");
    } catch (error) {
      throw error
    }
  },

}