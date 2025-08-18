import { timeZoneMoment } from './others';

export const GenerateOtp = () => {
  const otp = '123456';
  // const otp = Math.floor(100000 + Math.random() * 900000);
  let expiry = timeZoneMoment().add(10, 'm').toDate();

  return { otp, expiry };
};
