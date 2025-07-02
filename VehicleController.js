const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");

module.exports = {
    addvehicle: async (req, res) => {
        try {
            let validation = new Validator(req.body, {  
                VehicleMake: "required",
                VehicleModel: "required",
                VehicleType: "required",
                VehicleNumber: "required",
                VehicleColor: "required" ,
            });
            let validationError = await helper.CheckValidation(validation);
            if (validationError) {
                return helper.error400(res, validationError);
            }
            const vehicle = await db.vehicles.create({
                user_id: req.user.id,
                VehicleMake: req.body.VehicleMake,
                VehicleModel: req.body.VehicleModel,
                VehicleType: req.body.VehicleType,
                VehicleNumber: req.body.VehicleNumber,
                VehicleColor: req.body.VehicleColor,    
            });
            return helper.success(res, "Vehicle added successfully", vehicle);
        } catch (error) {
            const errorMessage = error.message || "An error occurred.";
            return helper.error500(res, errorMessage);
        }
    },
}