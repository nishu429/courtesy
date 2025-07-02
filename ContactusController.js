const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
module.exports = {
    addcontactus: async (req, res) => {
        try {
            let validation = new Validator(req.body, {  
                name:"required",
                email:"required",
                message: "required",
                phone_no: "required"
            });
            let validationError = await helper.CheckValidation(validation);
            if (validationError) {
                return helper.error400(res, validationError);
            }
            const contact = await db.contactus.create({
                name:req.body.name,
                email:req.body.email,
                message: req.body.message,
                country_code:req.body.country_code,
                phone_no: req.body.phone_no 
            });
            return helper.success(res, "contactus added successfully", contact);
        } catch (error) {
            console.log(error);
          const errorMessage = error.message || "An error occurred.";
          return helper.error500(res, errorMessage);
        }
    },
}