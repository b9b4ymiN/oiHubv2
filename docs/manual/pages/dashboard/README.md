# คู่มือหน้า Dashboard

- **Route:** `/dashboard`
- **บทบาทของหน้า:** cockpit หลักสำหรับการวิเคราะห์และตัดสินใจ

## เป้าหมายของหน้า
นี่คือหน้าหลักสำหรับการอ่าน market state แบบครบวงจร โดยรวม OI momentum, executive summary, multi-signal cards, smart money context, analysis tabs, และ AI quick actions ไว้ในที่เดียว

## สารบัญ
- [เป้าหมายของหน้า](#เป้าหมายของหน้า)
- [ใช้เมื่อไร / เหมาะกับใคร](#ใช้เมื่อไร--เหมาะกับใคร)
- [หน้านี้มีอะไรบ้าง](#หน้านี้มีอะไรบ้าง)
- [ปุ่มและการโต้ตอบสำคัญ](#ปุ่มและการโต้ตอบสำคัญ)
- [วิธีใช้งานที่แนะนำ](#วิธีใช้งานที่แนะนำ)
- [มุมมองแบบ OI Trader](#มุมมองแบบ-oi-trader)
- [ข้อควรระวัง](#ข้อควรระวัง)
- [หน้าที่เกี่ยวข้อง](#หน้าที่เกี่ยวข้อง)

## ใช้เมื่อไร / เหมาะกับใคร
เปิดหน้านี้เมื่อคุณต้องการตอบคำถามหลักก่อนเข้า trade:
- ตอนนี้ market state เป็นอย่างไร
- OI กำลัง build, unwind, accelerate หรือ fake move อยู่หรือไม่
- มี confluence พอสำหรับการเปิด position หรือยัง

## หน้านี้มีอะไรบ้าง
- **Executive Summary** ด้านบนสุดสำหรับสรุปภาพรวม
- **OI Momentum & Acceleration** เป็นแกนหลักของหน้า
- **Overview / Signals / Smart Money / Analysis tabs** สำหรับแยกมุมมอง
- **AI Quick Actions** สำหรับถามบริบททั้งหน้าแบบรวดเร็ว

## ปุ่มและการโต้ตอบสำคัญ
- **Symbol selector** เปลี่ยนสินทรัพย์หลัก
- **Interval selector** เปลี่ยนกรอบเวลา
- **Connection status** ใช้เช็ก freshness ของ data
- **อ่านคู่มือ** เปิด OI Momentum guide modal
- **Ask AI** ส่งบริบททั้งหน้าเข้า chat context

## วิธีใช้งานที่แนะนำ
1. เริ่มที่ Executive Summary เพื่อกรอง bias ขั้นต้น
2. อ่าน OI Momentum card และ timeline ก่อน เพื่อดู derivative ของ OI
3. เปิด tab `Signals` เมื่อกำลังหา setup
4. เปิด tab `Smart Money` เมื่อต้องการดู zone / participation bias
5. เปิด tab `Analysis` เมื่อต้องการเจาะ context เสริมก่อน commit trade

## มุมมองแบบ OI Trader
ในฐานะ OI trader หน้านี้ควรใช้เป็น **context board** ไม่ใช่ single-trigger board
- ถ้า OI momentum บอก continuation แต่ summary/risk context ไม่ support ให้ลด conviction
- ถ้า signal กับ smart money zones ขัดกัน ให้ชะลอการเข้า position
- ถ้า data connection ไม่สด ให้ลดน้ำหนักทุก signal ก่อน

## ข้อควรระวัง
- ห้ามอ่าน card เดียวแล้วสรุปทันที ควรใช้หลายส่วนประกอบร่วมกัน
- interval ที่ต่างกันอาจเปลี่ยน narrative ของ OI ได้มาก
- Ask AI มีประโยชน์สำหรับ synthesis แต่ไม่ควรแทนที่การอ่าน panel หลักด้วยตัวเอง

## หน้าที่เกี่ยวข้อง
- [`/intelligence`](../intelligence/README.md)
- [`/heatmap/oi`](../heatmap/oi/README.md)
- [`/orderbook`](../orderbook/README.md)
