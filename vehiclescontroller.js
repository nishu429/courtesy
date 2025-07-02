// const db = require('../../models');
// const helper = require('../../helper/helper');

// db.users.hasOne(db.vehicles, {
//   foreignKey: "user_id",
//   as: "vehicle", // Singular alias
// });

// // Vehicle belongs to one user
// db.vehicles.belongsTo(db.users, {
//   foreignKey: "user_id",
//   as: "user", // Singular alias
// }); 

// module.exports = {
//   vehicleslist: async (req, res) => {
//     try {
//       const data = await db.vehicles.findAll({
//         include: [{ model: db.users, as: 'users' }],
//       });
//       res.render("vehicles/vehicleslist", {
//         title: "Vehicles",
//         data,
//         session: req.session.admin,
//       });
//     } catch (error) {
//       throw error
//     }
//   },
//   vehicle_status: async (req, res) => {
//     try {
//       const result = await db.vehicles.update(
//         { status: req.body.status },
//         { where: { id: req.body.id } }
//       );
//       if (result[0] === 1) {
//         res.json({ success: true });
//       } else {
//         res.json({ success: false, message: "Status change failed" });
//       }
//     } catch (error) {
//       throw error
//     }
//   },
//   delete: async (req, res) => {
//     try {
//       if (!req.params.id) {
//         return res.status(400).json({ success: false, message: "vehicle ID is required" });
//       }
//       const vehicle = await db.vehicles.findByPk(req.params.id);
//       if (!vehicle) {
//         return res.status(404).json({ success: false, message: "vehicle not found" });
//       }
//       await db.vehicles.destroy({ where: { id: req.params.id } });

//       return res.json({ success: true, message: "vehicle deleted successfully" });
//     } catch (error) {
//       throw error
//     }
//   },
//   vehiclesview: async (req, res) => {
//     const view = await db.users.findOne({
//       where: { id: req.params.id },
//       include: [
//         {
//           model: db.vehicles,
//           as: "vehicle", // Singular alias as per the updated relationship
//           attributes: [
//             "VehicleMake",
//             "VehicleModel",
//             "VehicleType",
//             "VehicleColor",
//             "VehicleNumber",
//             "image",
//           ],
//         },
//       ],
//     });
// }
// }