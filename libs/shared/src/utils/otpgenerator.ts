import { timeZoneMoment } from './others';

export const GenerateOtp = (digits: number = 4) => {
  const otp = Math.floor(10 ** (digits - 1) + Math.random() * 9 * 10 ** (digits - 1)).toString();
  let expiry = timeZoneMoment().add(10, 'm').toDate();

  return { otp, expiry };
};
