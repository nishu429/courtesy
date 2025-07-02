const db = require('../../models');


db.ratings.belongsTo(db.users, { as: 'ratedBy', foreignKey: 'user_id' });
db.ratings.belongsTo(db.users, { as: 'ratedTo', foreignKey: 'ratinguser_id' });
db.ratings.belongsTo(db.bookings, {  foreignKey: 'booking_id' });
db.bookings.belongsTo(db.parkings, { as: 'parking', foreignKey: 'parking_id' });
module.exports = {
  rating_get: async (req, res) => {
    try {
      const data = await db.ratings.findAll({
        order: [['id', 'DESC']], 
        
        include: [
          {
            model: db.users,
            as: 'ratedBy', 
          },
          {
            model: db.users,
            as: 'ratedTo', 
          },
          
        ]
      });
  
      res.render('rating/ratinglist', {
        session: req.session.admin,
        title: 'Rating & Reviews',
        data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  },
  
  
  ratingview: async (req, res) => {
    try {
      let view = await db.ratings.findOne({
        include: [
          {
            model: db.users,
            as: 'ratedBy',
          },
          {
            model: db.users,
            as: 'ratedTo',
          },
          {
            model: db.bookings,
            include: [
              {
                model: db.parkings,
                as: 'parking',
                
              }
            ]
          }
        ],
        where: { id: req.params.id }
      });
  
      res.render("rating/ratingview.ejs", {
        session: req.session.admin,
        view,
        title: 'Rating & Reviews Detail',
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Server Error");
    }
  },
  rating_delete: async (req, res) => {
    try {
      if (!req.params.id) {
        return res.status(400).json({ success: false, message: "rating ID is required" });
      }
      const rating = await db.ratings.findByPk(req.params.id);
      if (!rating) {
        return res.status(404).json({ success: false, message: "rating not found" });
      }
      await db.ratings.destroy({ where: { id: req.params.id } });

      return res.json({ success: true, message: "rating deleted successfully" });
    } catch (error) {
      throw error
    }
  },
};
