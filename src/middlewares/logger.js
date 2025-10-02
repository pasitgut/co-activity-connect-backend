// const moment = require('moment-timezone');  // ใช้ moment-timezone
import moment from 'moment-timezone';
export const logger = (req, res, next) => {
  // เวลาที่เริ่มต้นในการคำนวณเวลาในการตอบกลับ
  const start = Date.now();

  // หาที่อยู่ IP ของผู้ใช้งาน
  const ip = req.ip || req.connection.remoteAddress;

  // หาข้อมูล User-Agent (browser details)
  const userAgent = req.get('User-Agent');

  // หาข้อมูล Query Params (ถ้ามี)
  const queryParams = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : 'No query params';

  // รับเวลาปัจจุบันในโซนเวลา Bangkok (UTC+7)
  const currentTime = moment().tz('Asia/Bangkok').format('YYYY-MM-DDTHH:mm:ss.SSSZ');

  // บันทึก log ก่อนที่จะส่ง response
  console.log(`[${currentTime}] ${req.method} ${req.url} from ${ip}`);
  console.log(`User-Agent: ${userAgent}`);
  console.log(`Query Params: ${queryParams}`);

  // บันทึก body ของ request สำหรับ POST, PUT, PATCH (ถ้าจำเป็น)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log(`Request Body: ${JSON.stringify(req.body)}`);
  }

  // บันทึกสถานะและเวลาที่ใช้ในการตอบกลับเมื่อ response ถูกส่งแล้ว
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${currentTime}] ${req.method} ${req.url} Status: ${res.statusCode} Response Time: ${duration}ms`);
  });

  // ไปที่ middleware หรือ route handler ถัดไป
  next();
};
