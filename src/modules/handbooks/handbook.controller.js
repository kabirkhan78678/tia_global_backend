const HandbookService = require('./handbook.service');

exports.addHandbook = async (req, res, next) => {
  try {
    const { title, grade_level } = req.body;
    const file = req.file;

    const handbook = await HandbookService.addHandbook({
      title,
      grade_level,
      file,
    });

    res.status(201).json({
      success: true,
      message: 'Handbook created successfully',
      data: handbook,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHandbook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await HandbookService.deleteHandbook(Number(id));
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getAdminHandbooks = async (req, res, next) => {
  try {
    const handbooks = await HandbookService.getAdminHandbooks();
    res.status(200).json({
      success: true,
      data: handbooks,
    });
  } catch (error) {
    next(error);
  }
};

exports.getStudentHandbooks = async (req, res, next) => {
  try {
    // Student auth token payload contains student's ID in req.user.id
    const studentId = req.user.id;
    const handbooks = await HandbookService.getStudentHandbooks(studentId);
    res.status(200).json({
      success: true,
      data: handbooks,
    });
  } catch (error) {
    next(error);
  }
};
