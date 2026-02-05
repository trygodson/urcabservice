import { timeZoneMoment } from './others';

export const GenerateOtp = () => {
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  let expiry = timeZoneMoment().add(10, 'm').toDate();

  return { otp, expiry };
};
