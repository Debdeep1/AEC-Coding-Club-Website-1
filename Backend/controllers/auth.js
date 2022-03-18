const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { SECRET } = process.env;
const User = require("../models/User");
const otpSender = require("./mailsender.js");
const {
  otpTemplate,
  announceall,
  notifyall,
  custom,
} = require("./emailTemplates");
const Counter = require("../models/Counter");

//? MARK : Register Route

exports.register = async (req, res) => {
  try {
    //* Getting Data from the BODY
    const {
      firstName,
      lastName,
      email,
      password,
      contact_no,
      batch,
      branch,
      confirmPassword,
      linkedin,
      github,
    } = req.body;

    // * Checking if any Data is Missing from the BODY
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !contact_no ||
      !batch ||
      !branch ||
      !confirmPassword
    ) {
      return res.json({
        success: false,
        error: "All Fields Are Required",
      });
    }

    // * Checking if Password and Confirm Password are Not Same
    if (password != confirmPassword) {
      return res.json({
        success: false,
        error: "Password and Confirm Password Does not Match",
      });
    }

    const existingUserE = await User.findOne({ email: email });
    const existingUserP = await User.findOne({ contact_no: contact_no });

    // ! Checking if the user already exists
    if (existingUserP || existingUserE) {
      return res.json({
        success: false,
        error: "User Already Exists",
      });
    }
    const myEncryPassword = await bcrypt.hash(password, 10);
    // !################################################################
    // *################################################################
    // ! OVERWRITING NOT VERIFIED USERS
    try {
      let count = await Counter.findOne({ branch: branch, batch: batch });
      const user_notActive = await User.findOne({ uid: count.notActive[0] });
      const userid = count.notActive[0];

      if (user_notActive) {
        if (
          (Date.now() - user_notActive.timeStamp) / (1000 * 24 * 60 * 60) >=
          1
        ) {
          const profilePicture = `https://avatars.dicebear.com/api/initials/${firstName} ${lastName}.svg`;
          let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
          let msg = `${otp}`;
          otpSender(email, otpTemplate(userid, msg));
          const filter = { uid: user_notActive.uid };
          const data = {
            firstName,
            lastName,
            email: email.toLowerCase(),
            contact_no,
            batch,
            branch,
            password: myEncryPassword,
            uid: userid,
            linkedin: linkedin,
            profilePicture,
            github: github,
            active: false,
            otpstatus: {
              otp: otp,
              wrongTry: 0,
              timeStamp: Date.now(),
              otpRequest: 1,
              initialTimeStamp: Date.now(),
            },
            timeStamp: Date.now(),
          };
          const valuereturn = await User.findOneAndUpdate(filter, data);
          const token = jwt.sign(
            {
              user_id: user_notActive.uid,
              email: user_notActive.email,
            },
            SECRET,
            {
              expiresIn: "24h",
            }
          );
          user_notActive.token = token;
          const removefromarray = await Counter.updateOne(
            { branch: branch, batch: batch },
            { $pull: { notActive: userid } }
          );
          const notActive = await Counter.updateOne(
            { branch: branch, batch: batch },
            { $push: { notActive: user_notActive.uid } }
          );

          return res.status(200).json({
            success: true,
            token,
            user: data,
          });
        }
      }
    } catch (error) {
      console.log(error.message);
    }
    // ! Injecting the Counter Part
    let countupdate;
    count = await Counter.findOne({ branch: branch, batch: batch });
    if (!count) {
      const countfresh = await Counter.create({
        seq: 1,
        branch: branch,
        batch: batch,
      });
      const countfreshfind = await Counter.findOne({
        branch: branch,
        batch: batch,
      });
      countupdate = await Counter.findByIdAndUpdate(
        { _id: countfreshfind._id },
        { $inc: { seq: 1 } }
      );
    } else {
      countupdate = await Counter.findByIdAndUpdate(
        { _id: count._id },
        { $inc: { seq: 1 } }
      );
    }

    // ! FORMATTING THE UID in Correct FORMAT
    let uid;

    if (parseInt(countupdate.seq / 10) === 0) {
      uid = `AECCC/${branch}/${batch}/000${countupdate.seq}`;
    } else if (parseInt(countupdate.seq / 100) === 0) {
      uid = `AECCC/${branch}/${batch}/00${countupdate.seq}`;
    } else if (parseInt(countupdate.seq / 1000) === 0) {
      uid = `AECCC/${branch} /${batch}/0${countupdate.seq}`;
    } else {
      uid = `AECCC/${branch}/${batch}/${countupdate.seq}`;
    }

    // ! Sending OTP to user's email

    let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
    let msg = `${otp}`;
    otpSender(email, otpTemplate(uid, msg));

    // ! Creating User in DB
    const profilePicture = `https://avatars.dicebear.com/api/initials/${firstName} ${lastName}.svg`;
    let user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      contact_no,
      batch,
      branch,
      password: myEncryPassword,
      uid: uid,
      linkedin: linkedin,
      profilePicture,
      github: github,
      active: false,
      otpstatus: {
        otp: otp,
        wrongTry: 0,
        timeStamp: Date.now(),
        otpRequest: 1,
        initialTimeStamp: Date.now(),
      },
    });

    const token = jwt.sign(
      {
        user_id: user.uid,
        email: user.email,
      },
      SECRET,
      {
        expiresIn: "24h",
      }
    );
    user.token = token;
    const options = {
      expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      httpOnly: true,
      token,
      user,
    };
    // TODO: ADD THE CREATED USER TO notActive Array in Counter
    const notActive = await Counter.updateOne(
      { branch: branch, batch: batch },
      { $push: { notActive: user.uid } }
    );

    return res.status(200).json({
      success: true,
      token,
      user: user,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      error: error.message,
    });
  }
};

//? MARK : Login Route

exports.login = async (req, res) => {
  try {
    // ! MARK : ID is EMAIL or UID generated
    const { uid, password } = req.body;
    if (!uid || !password) {
      return res.json({
        success: false,
        error: "Field is Missing",
      });
    }
    const user = await User.findOne({ uid });
    if (user && (await bcrypt.compare(password, user.password))) {
      const token = jwt.sign(
        {
          user_id: user.uid,
          email: user.email,
        },
        SECRET,
        {
          expiresIn: "2h",
        }
      );
      user.token = token;
      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        token,
        user,
      };
      return res.status(200).json({
        success: true,
        token,
        user,
      });
    } else {
      return res.json({
        success: false,
        error: "User Id or Password is incorrect",
      });
    }
  } catch (error) {
    console.log(error.message);
    return res.json({
      success: false,
      error: error.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  const otp = req.body.otp || req.params.otp;
  const uid = req.user.user_id;
  const email = req.user.email;
  if (otp) {
    docs = await User.findOne({ uid: uid });

    if (docs.otpstatus && docs.active == false) {
      if (Date.now() - docs.timeStamp > 5 * 60 * 60 * 1000) {
        let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
        let msg = `${otp}`;
        otpSender(email, otpTemplate(uid, msg));

        User.updateOne(
          { uid: uid },
          {
            $set: {
              otpstatus: {
                otp: otp,
                wrongTry: 0,
                timeStamp: Date.now(),
                otpRequest: 1,
                initialTimeStamp: Date.now(),
              },
            },
          }
        )
          .then((msg) => {})
          .catch((err) => {
            console.log(err.message);
          });

        res.send({
          success: true,
          token: true,
          msg: "otp has been expired, new OTP has sent",
        });
      } else if (docs.otpstatus.wrongTry > 5) {
        if (Date.now() - docs.initialTimeStamp > 24 * 60 * 60 * 1000) {
          let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
          let msg = `${otp}`;
          otpSender(email, otpTemplate(uid, msg));

          User.updateOne(
            { uid: uid },
            {
              $set: {
                otpstatus: {
                  otp: otp,
                  wrongTry: 0,
                  timeStamp: Date.now(),
                  otpRequest: 1,
                  initialTimeStamp: Date.now(),
                },
              },
            }
          )
            .then((msg) => {})
            .catch((err) => {
              console.log(err);
            });
          res.send({
            success: true,
            token: true,
            msg: "otp has been expired, new OTP has sent",
          });
        } else if (docs.otpstatus.wrongTry > 5) {
          if (Date.now() - docs.initialTimeStamp > 24 * 60 * 60 * 1000) {
            let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
            let msg = `${otp}`;
            otpSender(email, otpTemplate(uid, msg));

            User.updateOne(
              { uid: uid },
              {
                $set: {
                  otpstatus: {
                    otp: otp,
                    wrongTry: 0,
                    timeStamp: Date.now(),
                    otpRequest: 1,
                    initialTimeStamp: Date.now(),
                  },
                },
              }
            )
              .then((msg) => {})
              .catch((err) => {
                console.log(err);
              });
            res.send({
              success: true,
              token: true,
              msg: "otp has been expired, new OTP has sent",
            });
          } else if (docs.otpstatus.otpRequest < 5) {
            let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
            let msg = `${otp}`;
            otpSender(email, otpTemplate(uid, msg));

            User.updateOne(
              { uid: uid },
              {
                $set: {
                  otpstatus: {
                    otp: otp,
                    wrongTry: 0,
                    timeStamp: Date.now(),
                    otpRequest: docs.otpstatus.otpRequest + 1,
                    initialTimeStamp: docs.otpstatus.initialTimeStamp,
                  },
                },
              }
            )
              .then((msg) => {})
              .catch((err) => {
                console.log(err);
              });

            res.send({
              success: true,
              token: true,
              msg: "OTP has been expired, New OTP has sent",
            });
          } else {
            return res.send({
              success: false,
              token: true,
              message: "Maximum Attempt Exeeded",
            });
          }
        } else if (docs.otpstatus.otp != otp) {
        } else if (docs.otpstatus.otpRequest < 5) {
          let otp = Math.floor(10000 + (1 - Math.random()) * 100000);
          let msg = `${otp}`;
          otpSender(email, otpTemplate(uid, msg));

          User.updateOne(
            { uid: uid },
            {
              $set: {
                otpstatus: {
                  otp: otp,
                  wrongTry: 0,
                  timeStamp: Date.now(),
                  otpRequest: docs.otpstatus.otpRequest + 1,
                  initialTimeStamp: docs.otpstatus.initialTimeStamp,
                },
              },
            }
          )
            .then((msg) => {})
            .catch((err) => {
              console.log(err.message);
            });

          res.send({
            success: true,
            token: true,
            msg: "otp has been expired, new OTP has sent",
          });
        } else {
          return res.send({
            success: false,
            token: true,
            message: "maximum attempt exeeded",
          });
        }
      } else if (docs.otpstatus.otp != otp) {
        User.updateOne(
          { uid: uid },
          { $set: { "otpstatus.wrongTry": docs.otpstatus.wrongTry + 1 } }
        )
          .then((msg) => {})
          .catch((err) => {
            console.log(err);
          });
        return res.send({
          success: false,
          token: true,
          message: "wrong otp",
        });
      } else {
        await User.updateOne(
          { uid: uid },
          { $set: { active: true, otpstatus: null } }
          // TODO: Remove the Activated User from Unactivated Array in Counter
        );
        userupdate = await User.findOne({ uid: uid });

        Counter.updateOne(
          { branch: userupdate.branch, batch: userupdate.batch },
          { $pull: { notActive: uid } }
        )
          .then(() => {})
          .catch(() => {});

        return res
          .status(200)
          .send({ success: true, token: true, message: "account activated" });
      }
    } else {
      res.redirect("/api/v1/dashboard");
    }
  }
};
