import { HttpStatus } from '@nestjs/common';
import { ApiErrorException } from '../../common/errors/api-error.exception';

export const authRequiredError = () =>
  new ApiErrorException('Authentication required.', 'AUTH_REQUIRED', HttpStatus.UNAUTHORIZED);

export const forbiddenError = () =>
  new ApiErrorException(
    'You do not have permission to access this resource.',
    'FORBIDDEN',
    HttpStatus.FORBIDDEN,
  );
