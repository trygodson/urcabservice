import { registerAs } from '@nestjs/config';

export default registerAs('config', () => ({
  port: parseInt(process.env['PORT'] ?? '5000', 10) || 5000,
  nodenv: process.env['NODE_ENV'],
}));
// let dd=  [
//   {val: 4, check: true},
//   {val: 6, check: false},
//   {val: 54, check: true},
//   {val: 22, check: true},
// ]
