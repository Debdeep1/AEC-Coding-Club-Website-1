const event = require("../models/Event");
const User = require("../models/User");
const Elog = require("../models/Eventlog");
const otpSender = require("./mailsender.js");
const {
  otpTemplate,
  announceall,
  notifyall,
  custom,
} = require("./emailTemplates");

exports.announceall = async (req, res) => {
  // date = req.body.eventDate;
  const { eventTitle, eventTime, eventImage, eventDetails } = req.body;

  if (!eventTitle || !eventTime || !eventImage || !eventDetails) {
    res.json({
      message: "All Data is required",
      success: false,
    });
  }
  let emails = await User.find({}, { _id: false, email: true });
  let emaillist = [];
  for (i = 0; i < emails.length; i++) {
    emaillist.push(emails[i].email);
  }

  otpSender(
    emaillist,
    announceall(
      eventTitle,
      eventTime,
      eventImage,
      eventDetails,
      "https://testaeccc.web.app/events"
    )
  );

  const user_id = req.user.user_id;
  const userDetails = await User.findOne({ uid: req.user.user_id });
  const userName = userDetails.firstName + " " + userDetails.lastName;

  const logData = await Elog.create({
    Operation: "Email Announcement",
    updatedby: user_id,
    userName: userName,
    eventTitle: eventTitle,
    eventDescription: `${eventDetails} -- ${eventTime}`,
    image: eventImage,
    updatedAt: Date(),
  });

  return res.json({
    success: true,
    msg: `email will be delivered to ${emails.length} participants`,
  });
};

exports.getevent = async (req, res) => {
  try {
    const Event = await event.findOne({ _id: req.params.id });

    if (!Event) return res.status(404).json({ error: "No Events Found" });

    return res.status(200).json(Event);
  } catch (error) {
    console.log(error);
    res.json({ error: error.message });
  }
};

// Get All Events
exports.getAll = async (req, res) => {
  try {
    const events = await event.find({});
    res.status(200).json({ events: events.reverse(), length: events.length });
  } catch (error) {
    console.log(error);
    res.json({ error: "Cannot Find Events" });
  }
};

// Create New Event
exports.add = async (req, res) => {
  try {
    if (
      !req.body.eventTitle ||
      !req.body.eventTime ||
      !req.body.eventImage ||
      !req.body.eventDetails
    ) {
      return res.json({
        success: false,
        token: true,
        error: "All Fields Are Required",
      });
    }
    const newEvent = await event.create(req.body);
    const user_id = req.user.user_id;
    const userDetails = await User.findOne({ uid: req.user.user_id });
    const userName = userDetails.firstName + " " + userDetails.lastName;

    const logData = await Elog.create({
      Operation: "Event Addition",
      updatedby: user_id,
      userName: userName,
      eventTitle: req.body.eventTitle,
      eventDescription: req.body.eventDetails,
      image: req.body.eventImage,
      updatedAt: Date(),
    });

    res.status(200).json({
      _id: newEvent._id,
      title: newEvent.title,
      description: newEvent.description,
      image: newEvent.image,
      form: newEvent.form,
      date: newEvent.date,
      role: req.role,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, token: true, error: "Cannot Create Event" });
  }
};

// Update Specific Event Based On It's ID
exports.update = async (req, res) => {
  try {
    const eventid = req.params.id;

    if (
      !req.body.eventTitle ||
      !req.body.eventTime ||
      !req.body.eventImage ||
      !req.body.eventDetails
    ) {
      return res.json({
        success: false,
        token: true,
        error: "All Fields Are Required",
      });
    }
    const Event = await event.findByIdAndUpdate(eventid, req.body, {
      new: true,
      runValidators: true,
    });

    const user_id = req.user.user_id;
    const userDetails = await User.findOne({ uid: req.user.user_id });
    const userName = userDetails.firstName + " " + userDetails.lastName;
    // const modification = ;
    const logData = await Elog.create({
      Operation: "Event Updation",
      updatedby: user_id,
      userName: userName,
      eventTitle: req.body.eventTitle,
      eventDescription: req.body.eventDetails,
      image: req.body.eventImage,
      updatedAt: Date(),
    });

    if (!Event) {
      return res.json({
        Message: "Can't find any user like this",
      });
    }

    return res.status(200).json({
      Message: "Data Updated Successfully",
      Event: Event,
      success: true,
    });
  } catch (error) {
    console.log(error);
    return res.json({
      Error: "Something Went Wrong",
      Message: error.message,
      success: false,
      token: true,
    });
  }
};

// Dete Specifit Event Based On It's ID
exports.deletevent = async (req, res) => {
  try {
    // const modification = ;

    const deletedEvent = await event.findByIdAndDelete(req.params.id);
    const user_id = req.user.user_id;
    const userDetails = await User.findOne({ uid: req.user.user_id });
    const userName = userDetails.firstName + " " + userDetails.lastName;
    const logData = await Elog.create({
      Operation: "Delete Operation",
      updatedby: user_id,
      userName: userName,
      eventTitle: deletedEvent.eventTitle,
      eventDescription: deletedEvent.eventDescription,
      image: deletedEvent.image,
      updatedAt: Date(),
    });
    const deletedUser = await User.updateMany(
      { event: req.params.id },
      { $pull: { event: req.params.id } }
    );

    if (!deletedEvent) {
      return res
        .status(404)
        .json({ success: false, token: true, message: "Cannot Find Event" });
    }

    res.status(200).json({
      success: true,
      token: true,
      _id: deletedEvent._id,
      title: deletedEvent.title,
      description: deletedEvent.description,
      image: deletedEvent.image,
      form: deletedEvent.form,
      date: deletedEvent.date,
      role: req.role,
      success: true,
    });
  } catch (error) {
    res.json({
      token: true,
      error: "Cannot Delete Event",
    });
  }
};
// ! TODO: When User Registers into a Event No Duplicate event can't be in the same array
exports.registerevent = async (req, res) => {
  try {
    const id = req.params.id;
    const user_id = req.user.user_id;

    const tempuser = await User.findOne({ uid: user_id });
    tempuser;
    if (tempuser.event.includes(id)) {
      return res.status(400).json({
        success: false,
        token: true,
        message: "You are Already Registered for the Event",
      });
    }
    const updateevent = await event.updateOne(
      { _id: id },
      {
        $push: {
          name: `${tempuser.firstName} ${tempuser.lastName}`,
          email: req.user.email,
          userId: user_id,
        },
      }
    );
    const updateuser = await User.updateOne(
      { uid: user_id },
      { $push: { event: id } }
    );
    return res
      .status(200)
      .json({ success: true, token: true, message: "Event Added", updateuser });
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, token: true, message: error.message });
  }
};
