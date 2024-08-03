interface UserSignedUpJob {
  type: "userSignedUp";
  email: string;
}

interface ResetPasswordRequestJob {
  type: "resetPasswordRequest";
  email: string;
  resetToken: string;
}

export type EmailQueueJob = UserSignedUpJob | ResetPasswordRequestJob;
