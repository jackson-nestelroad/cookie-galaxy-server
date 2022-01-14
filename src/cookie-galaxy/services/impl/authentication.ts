import {AuthenticationServiceInterface} from '../interfaces/authentication';
import {ObjectId} from 'mongodb';
import {Service} from '../../../framework/service';
import jwt from 'jsonwebtoken';

export class AuthenticationService implements Service, AuthenticationServiceInterface {
  id = Symbol('AuthenticationService');

  public createToken(id: ObjectId): string {
    return jwt.sign({id}, process.env.TOKEN_KEY, {
      expiresIn: '24h',
    });
  }

  public verifyToken(token: string): ObjectId {
    try {
      const {id} = jwt.verify(token, process.env.TOKEN_KEY) as jwt.JwtPayload;
      return new ObjectId(id);
    } catch (err) {
      return null;
    }
  }
}
