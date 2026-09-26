import { Logger } from '@nestjs/common';

// HttpExceptionFilter log mọi 4xx ở mức error; test cố tình tạo ra rất nhiều lỗi 4xx nên tắt hẳn log Nest.
Logger.overrideLogger(false);
