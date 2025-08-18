import * as crypto from 'crypto-js';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

const configService = new ConfigService();

interface LoginTokenInterface extends jwt.JwtPayload {
  [key: string]: any;
}
export const JwtSign = (data: Record<string, unknown>) => {
  const jwt_secret = configService.get('JWT_SECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};
export const JwtDSign = (data: Record<string, unknown>) => {
  const jwt_secret = configService.get('JWT_DSECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};
export const JwtSignRefresh = (data: Record<string, unknown>, refreshToken?: string) => {
  const jwt_secret = configService.get('JWT_SECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};

export const JwtAdminSign = (data: Record<string, unknown>) => {
  const jwt_secret = configService.get('JWT_ASECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};

export const JwtAdminSignRefresh = (data: Record<string, unknown>, refreshToken?: string) => {
  const jwt_secret = configService.get('JWT_ASECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};
export const JwtDSignRefresh = (data: Record<string, unknown>, refreshToken?: string) => {
  const jwt_secret = configService.get('JWT_DSECRET');

  const jwt_expires = configService.get('JWT_EXPIRATION');

  const jwtData = {
    ...data,
  };

  const encrypted = crypto.AES.encrypt(JSON.stringify(jwtData), jwt_secret).toString();

  const token = jwt.sign({ data: encrypted }, jwt_secret, {
    expiresIn: `${jwt_expires}h`,
  });

  return token;
};

export const JwtVerifyWithRefresh = (token: string, refresh?: string) => {
  const jwt_secret = configService.get('JWT_SECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;

    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    if (err.message.includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    return { verified: false };
  }
};
export const JwtAdminVerifyWithRefresh = (token: string, refresh?: string) => {
  const jwt_secret = configService.get('JWT_ASECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;

    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    if (err.message.includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    return { verified: false };
  }
};
export const JwtDVerifyWithRefresh = (token: string, refresh?: string) => {
  const jwt_secret = configService.get('JWT_DSECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;

    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    if (err.message.includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    return { verified: false };
  }
};
export const JwtVerify = (token: string) => {
  const jwt_secret = configService.get('JWT_SECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;
    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    // console.log(err, 'decoded error');
    if (err['message'].includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    if (err.message.includes('malformed')) {
      throw new UnauthorizedException('Malformed Token! Please Sign in.');
    }
    return { verified: false };
  }
};
export const JwtAVerify = (token: string) => {
  const jwt_secret = configService.get('JWT_ASECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;
    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    // console.log(err, 'decoded error');
    if (err['message'].includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    if (err.message.includes('malformed')) {
      throw new UnauthorizedException('Malformed Token! Please Sign in.');
    }
    return { verified: false };
  }
};
export const JwtDVerify = (token: string) => {
  const jwt_secret = configService.get('JWT_DSECRET');

  if (!token) {
    throw new UnauthorizedException('You are not authorized! Please Sign in.');
  }

  try {
    const decoded = jwt.verify(token, jwt_secret) as LoginTokenInterface;
    let bytes = crypto.AES.decrypt(decoded['data'], jwt_secret);
    let decrypted = JSON.parse(bytes.toString(crypto.enc.Utf8));

    return { verified: true, data: decrypted };
  } catch (err: any) {
    // console.log(err, 'decoded error');
    if (err['message'].includes('expired')) {
      throw new UnauthorizedException('Token Expired! Please Sign in.');
    }
    if (err.message.includes('invalid')) {
      throw new UnauthorizedException('Invalid Token! Please Sign in.');
    }
    if (err.message.includes('malformed')) {
      throw new UnauthorizedException('Malformed Token! Please Sign in.');
    }
    return { verified: false };
  }
};

export function isWSValidAuthHeader(authorization: string) {
  const token: string = authorization.split(' ')[1];

  const payload = jwt.verify(token, configService.get('JWT_SECRET'), {
    ignoreExpiration: false,
  });

  return payload;
}
