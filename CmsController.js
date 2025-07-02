const db = require("../../models");
const helper = require("../../helper/helper");
const { Validator } = require("node-input-validator");
module.exports = {
  cms: async (req, res) => {
    try {
      let validation = new Validator(req.query,{
        type:"required"
      });
      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      let cms_data = await db.cms.findOne({
        where: { type: req.query.type },
        raw: true,
      });
      return helper.success(res, "CMS fetched successfully", cms_data);
    } catch (error) {
      const errorMessage = error.message || "An Error occur .";
      return helper.error500(res, errorMessage);
    }
  },

 

};
