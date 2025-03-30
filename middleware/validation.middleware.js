import { body, param, query, validationResult } from "express-validator";

export const validate = (validation) => {
  return async (req, res, next) => {
    // run all validations
    await Promise.all(validation.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedError = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    throw new Error(extractedError);
  };
};

export const commonValidations = {
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .message("page must be an positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1 })
      .message("limit must be an positive integer"),
  ],
  email: body("email").isEmail().withMessage("Please provide a valid email"),
  name: body("name")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name is required"),
};

export const validateSignUp = validate([
  commonValidations.email,
  commonValidations.name,
]);
