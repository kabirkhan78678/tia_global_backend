const UserEventsService = require('./user.events.service');

exports.getParentEvents = async (req, res, next) => {
  try {
    const parentId = req.user.id;
    const events = await UserEventsService.getParentEvents(parentId);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getTeacherEvents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const events = await UserEventsService.getTeacherEvents(teacherId);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getStudentEvents = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const events = await UserEventsService.getStudentEvents(studentId);

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return next(error);
  }
};
