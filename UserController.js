const { Validator } = require("node-input-validator");
const db = require("../../models");
const helper = require("../../helper/helper");
const nodemailer = require("nodemailer");
const CryptoJS = require("crypto-js");

module.exports = {
  getprofile: async (req, res) => {
    try {
      let validation = new Validator({});
      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      let users_profile = await db.users.findOne({
        include: [
          {
            model: db.vehicles,
            as: "userVehicles",
          },
        ],
        where: {
          id: req.user.id,
        },
      });
      return helper.success(res, "Profile Get successfully", users_profile);
    } catch (error) {
      const errorMessage = error.message || "An Error occur .";
      return helper.error500(res, errorMessage);
    }
  },
  userupdate: async (req, res) => {
    try {
      let validation = new Validator(req.body, {});

      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      const userId = req.user.id;
      let imagePath = null;
      if (req.files?.image) {
        const folder = "admin";
        imagePath = await helper.fileUpload(req.files.image, folder);
        req.body.image = imagePath;
      }
      if (req.body.country_code && req.body.phone) {
        req.body.phone_number = `${req.body.country_code}${req.body.phone}`;
      }
      const [userUpdatedRows] = await db.users.update(req.body, {
        where: { id: userId },
      });

      const [vehicleUpdatedRows] = await db.vehicles.update(
        {
          VehicleMake: req.body.VehicleMake,
          VehicleModel: req.body.VehicleModel,
          VehicleType: req.body.VehicleType,
          VehicleColor: req.body.VehicleColor,
        },
        { where: { user_id: userId } }
      );
      const user = await db.users.findOne({
        include: [
          {
            model: db.vehicles,
            as: "userVehicles",
          },
        ],
        where: { id: userId },
      });
      return helper.success(res, "User and vehicle updated successfully", user);
    } catch (error) {
      return helper.error500(res, error.message || "An error occurred.");
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const validation = new Validator(req.body, {
        email: "required",
      });

      const errorResponse = await helper.CheckValidation(validation);
      if (errorResponse) {
        return helper.error400(res, errorResponse);
      }

      const checkEmail = await db.users.findOne({
        where: { email: req.body.email },
      });

      if (!checkEmail) {
        return helper.error400(res, "User Not Register With Us.");
      }

      const ran_token = Math.random().toString(36).substring(2, 25);

      const save_data = await db.users.update(
        {
          forgotPasswordToken: ran_token,
          created_at: helper.unixTimestamp(),
        },
        {
          where: { id: checkEmail.id },
        }
      );

      const baseUrl = `${req.protocol}://${req.get("host")}/api/resetPassword/${
        checkEmail.id
      }/${ran_token}`;

      const forgotpassword = `
                    Hello ${checkEmail.name},<br> 
                    Your Forgot Password Link is: <a href="${baseUrl}"><u>CLICK HERE TO RESET PASSWORD </u></a>. 
                    <br><br><br> 
                    Regards,<br> 
                    Courtesy`;
      6;

      const transporter = nodemailer.createTransport({
        host: "sandbox.smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "2f4ff81f2403d3",
          pass: "2f683d033a710e",
        },
      });

      const info = await transporter.sendMail({
        from: '"Courtesy" <raman@example.com>',
        to: req.body.email,
        subject: "Forget Password Link",
        text: "Hello world?",
        html: forgotpassword,
      });

      return helper.success(
        res,
        "Please follow the reset password link sent to your email.",
        baseUrl
      );
    } catch (error) {
      const errorMessage =
        error.message || "An error occurred while processing your request.";
      return helper.error500(res, errorMessage);
    }
  },

  resetPassword: async (req, res) => {
    try {
      let token = req.params.ran_token;
      let user_id = req.params.id;

      let checkToken = await db.users.findOne({
        where: {
          forgotPasswordToken: token,
        },
        raw: true,
      });

      console.log(checkToken, "Token verification");

      if (!checkToken?.forgotPasswordToken) {
        res.redirect("/api/linkExpired");
      } else {
        res.render("admin/forgotpasword", {
          token: token,
          id: user_id,
          tokenFound: true,
          layout: false,
        });
      }
    } catch (error) {
      const errorMessage = error.message || "An Error occur in Resetpassword.";
      return helper.error500(res, errorMessage);
    }
  },
  updateForgotPassword: async (req, res) => {
    try {
      let check_token = await db.users.findOne({
        where: {
          forgotPasswordToken: req.body.token,
        },
        raw: true,
      });
      if (check_token?.forgotPasswordToken) {
        const validation = new Validator(req.body, {
          password: "required",
          confirm_password: "required|same:password",
        });
        let errorsResponse = await helper.CheckValidation(validation);
        if (errorsResponse) {
          return helper.error400(res, errorsResponse);
        }
        let password = validation.inputs.password;
        let cipherpassword = CryptoJS.AES.encrypt(
          req.body.password,
          "secret key 443"
        ).toString();
        // var ciphertext = CryptoJS.AES.encrypt(req.body.password, 'secret key 443').toString();

        await db.users.update(
          {
            password: cipherpassword,
            forgotPasswordToken: "",
            updated_at: helper.unixTimestamp(),
          },
          {
            where: { forgotPasswordToken: req.body.token },
          }
        );
        res.render("admin/sucessmsg");
      } else {
        res.redirect("/api/resetPassword/:id/:ran_token", {
          token: 0,
          id: 0,
          tokenFound: 0,
        });
      }
    } catch (error) {
      const errorMessage = error.message || "An Error occur .";
      return helper.error500(res, errorMessage);
    }
  },
  linkExpired: async (req, res) => {
    try {
      res.render("admin/expire");
    } catch (error) {
      const errorMessage = error.message || "An Error occur ";
      return helper.error500(res, errorMessage);
    }
  },
  sucessmsg: async (req, res) => {
    try {
      res.render("admin/sucessmsg", { layout: false });
    } catch (error) {
      const errorMessage = error.message || "An Error occur ";
      return helper.error500(res, errorMessage);
    }
  },

  deleteaccount: async (req, res) => {
    try {
      const userid = req.user.id;

      let user = await db.users.findOne({
        where: { id: userid },
      });

      if (!user) {
        return helper.error400(res, "User not found");
      }
      await db.users.update(
        {
          deletedAt: new Date(),
        },
        {
          where: { id: userid },
        }
      );
      return helper.success(res, "Account deleted successfully");
    } catch (error) {
      return helper.error500(res, error.message || "An error occurred.");
    }
  },
};
