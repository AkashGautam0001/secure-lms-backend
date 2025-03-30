import { ApiError, catchAsync } from "../middleware/error.middleware";
import { User } from "../models/user.model";
import { generateToken } from "../utils/generateToken";

export const createUserAccount = catchAsync(async (req, res) => {
  const { name, email, password, role = "student" } = req.body;

  // we will do validation globally
  const exitingUser = await User.findOne({ email: email.toLowerCase() });

  if (exitingUser) {
    throw new ApiError("User already exists", 400);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
  });

  await user.updateLastActive();
  generateToken(res, user, "User account created successfully");
});

export const authenticateUser = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user || (await user.comparePassword(password))) {
    throw new ApiError("User not found", 404);
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    throw new ApiError("Invalid credentials", 401);
  }

  await user.updateLastActive();

  generateToken(res, user, "User logged in successfully");
});
