import { SetMetadata } from '@nestjs/common';
import { NO_API_LOG_KEY } from '../common/logging.interceptor';

export const NoApiLog = () => SetMetadata(NO_API_LOG_KEY, true);
