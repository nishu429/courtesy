const { Validator } = require("node-input-validator");
const helper = require("../../helper/helper");
const db = require("../../models");
const CryptoJS = require("crypto-js");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");

module.exports = {
  signup: async (req, res) => {
    try {
      const {
        country_code,
        phone,
        name,
        email,
        password,
        device_token,
        device_type,
        role,
        location,
        latitude,
        longitude,
        VehicleMake,
        VehicleModel,
        VehicleType,
        VehicleColor,
      } = req.body;
      let validation = new Validator(req.body, {
        name: "required",
        email: "required",
        password: "required",
        device_token: "required",
        device_type: "required",
        VehicleMake: "required",
        VehicleModel: "required",
        VehicleType: "required",
        VehicleColor: "required",
      });

      let validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }

      let existingUser = await db.users.findOne({
        where: { email: req.body.email },
      });

      if (existingUser) {
        return helper.error400(res, "Email already exists");
      }

      const ciphertext = CryptoJS.AES.encrypt(
        password,
        "secretkey443"
      ).toString();

      let image = "";
      let folder = "admin";
      if (req.files && req.files.image) {
        image = await helper.fileUpload(req.files.image, folder);
      }
      let newUser = await db.users.create({
        name,
        email,
        password: ciphertext,
        image,
        country_code,
        phone,
        status: 1,
        role,
        location,
        latitude,
        longitude,
        login_time: helper.unixTimestamp(),
        otp: 1111,
        device_type,
        device_token,
        is_verify: 1,
        deletedAt: null,
      });
      if (VehicleMake && VehicleModel && VehicleType && VehicleColor) {
        vehicle = await db.vehicles.create({
          user_id: newUser.id,
          VehicleMake,
          VehicleModel,
          VehicleType,
          VehicleColor,
        });
      }
      const userData = await db.users.findOne({
        where: { id: newUser.id },
        include: [
          {
            model: db.vehicles,
            as: "userVehicles",
          },
        ],
      });
      const token = jwt.sign(
        {
          id: userData.id,
          email: userData.email,
          login_time: helper.unixTimestamp(),
        },
        "secretkey443"
      );
      const userJson = userData.toJSON();
      userJson.token = token;

      return helper.success(res, "Signup successful", userJson);
    } catch (error) {
      console.log(error);
      const errorMessage = error.message || "Internal server error";
      return helper.error500(res, errorMessage);
    }
  },

  signin: async (req, res) => {
    try {
      const { email, password, device_type, device_token } = req.body;

      const validation = new Validator(req.body, {
        email: "required",
        password: "required",
        device_type: "required",
        device_token: "required",
      });
      const validationError = await helper.CheckValidation(validation);
      if (validationError) {
        return helper.error400(res, validationError);
      }
      const user = await db.users.findOne({
        where: { email },
        include: [
          {
            model: db.vehicles,
            as: "userVehicles",
          },
        ],
      });
      if (!user) {
        return helper.error400(res, "User is not registered ");
      }
      const decryptedPassword = CryptoJS.AES.decrypt(
        user.password,
        process.env.secret_key
      ).toString(CryptoJS.enc.Utf8);
      if (decryptedPassword !== password) {
        return helper.error400(res, "Password is incorrect");
      }
      const loginTime = helper.unixTimestamp();
      await db.users.update(
        { login_time: loginTime, device_token, device_type },
        { where: { email } }
      );
      const token = jwt.sign(
        { id: user.id, email: user.email, login_time: loginTime },
        process.env.secret_key
      );
      const userData = user.toJSON();
      userData.token = token;

      return helper.success(res, "Signin successfully", userData);
    } catch (error) {
      console.log(error);

      return helper.error500(res, error.message || "Internal server error");
    }
  },

  verifyotp: async (req, res) => {
    try {
      let validation = new Validator(req.body, {
        email: "required",
        otp: "required",
      });

      let validationerror = await helper.CheckValidation(validation);
      if (validationerror) {
        return helper.error400({ res, validationerror });
      }

      let getuser = await db.users.findOne({
        where: { email: req.body.email },
        raw: true,
      });

      if (!getuser) {
        return helper.error400(res, "Invalid email");
      }

      if (getuser.otp == req.body.otp) {
        await db.users.update(
          {
            otp: 0,
            is_verify: 1,
          },
          { where: { email: req.body.email } }
        );

        const loginTime = helper.unixTimestamp();
        await db.users.update(
          { login_time: loginTime },
          { where: { email: req.body.email } }
        );
        const token = jwt.sign(
          {
            id: getuser.id,
            email: getuser.email,
            login_time: loginTime,
          },
          "secretkey443"
        );
        let updatedUser = await db.users.findOne({
          where: { email: req.body.email },
          raw: true,
        });

        updatedUser.token = token;

        return helper.success(res, "Otp verified successfully", updatedUser);
      } else {
        return helper.error400(res, "Invalid OTP");
      }
    } catch (error) {
      return helper.error500(res, error.message || "Internal server error");
    }
  },

  otpresend: async (req, res) => {
    try {
      const { email } = req.body;

      const validation = new Validator(req.body, {
        email: "required",
      });
      const validationError = await helper.CheckValidation(validation);
      if (validationError) return helper.error400(res, validationError);

      let find_user = await db.users.findOne({
        where: { email },
      });
      if (!find_user) return helper.error400(res, "User not found");

      await db.users.update(
        {
          is_verify: 0,
          otp: 1111,
        },
        { where: { email } }
      );

      return helper.success(res, "OTP sent successfully");
    } catch (error) {
      return helper.error500(res, error.message || "Internal server error");
    }
  },
  logout: async (req, res) => {
    try {
      const updatedRows = await db.users.update(
        {
          login_time: 0,
          device_token: "",
          device_type: 0,
        },
        {
          where: {
            id: req.user.id,
          },
        }
      );
      return helper.success(res, "Logout Successfully", {});
    } catch (error) {
      const errorMessage = error.message || "Internal server error";
      return helper.error500(res, errorMessage);
    }
  },

  // checkUSers: async (req, res) => {
  //   try {
  //     const required = {};
  //     const nonRequired = {
  //       phone: req.body.phone_number,
  //       email: req.body.email,
  //     };

  //     let requestData = await helper.vaildObject(required, nonRequired);
  //     let where = "";
  //     if (requestData.email) {
  //       where = {
  //         email: requestData.email,
  //       };
  //     } else if (requestData.phone_number) {
  //       where = {
  //         phone_number: requestData.phone_number,
  //         country_code: req.body.country_code,
  //       };
  //     }
  //     var find_user = await models["users"].findOne({
  //       where: where,
  //     });

  //     // console.log(find_user,"dddddddddddddd");return

  //     if (find_user) {
  //       if (requestData.email == find_user.email) {
  //         return helper.error(res, "Email already exists");
  //       } else if (
  //         req.body.phone_number == find_user.phone_number &&
  //         req.body.country_code == find_user.country_code
  //       ) {
  //         console.log("xsdsghadfghgsdf");

  //         return helper.error(res, "This Phone Number already exit");
  //       } else {
  //         console.log(":scdvgasfghsd");
  //       }
  //       return;
  //     } else {
  //       if (req.body.type == 1) {
  //         var phone_otp = Math.floor(1000 + Math.random() * 9000);
  //         let phone_Number = req.body.country_code + req.body.phone_number;
  //         await client.messages
  //           .create({
  //             body: `${phone_otp} your Sportii One Time password `,
  //             from: "SPORTII",
  //             to: phone_Number,
  //           })
  //           .then((message) => console.log(message.sid))
  //           .catch((err) => {
  //             console.log(err, ">>>>>>>>>>>>>>>>.");
  //           });
  //         const obj = {
  //           phone_number: req.body.phone_number,
  //           country_code: req.body.country_code,
  //           otp: phone_otp,
  //         };
  //         return helper.success(res, "user does not exists", obj);
  //       } else {
  //         return helper.success(res, "user does not exists", {});
  //       }
  //     }
  //   } catch (error) {
  //     console.log(error);

  //     return helper.error(res, error);
  //   }
  // },

  userexist: async (req, res) => {
    try {
      let where = {};

      if (req.body.email) {
        where.email = req.body.email;
      } else if (req.body.phone && req.body.country_code) {
        where.phone = req.body.phone;
        where.country_code = req.body.country_code;
      }

      const find_user = await db.users.findOne({ where });

      if (find_user) {
        return helper.error400(res, "User already exists.", find_user);
      } else {
        const otp = 1111;

        return helper.success(res, "User does not exist ", { otp });
      }
    } catch (error) {
      return helper.error500(res, error.message || "Internal server error");
    }
  },
  testing: async (req, res) => {
    try {
      exec("git pull", (error, stdout, stderr) => {
        if (error) {
          return res.status(500).json({ error: `Error: ${error.message}` });
        }
        res.json({ output: stdout || stderr });
      });
    } catch (error) {
      console.log("error", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};
