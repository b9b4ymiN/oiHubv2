# คู่มือหน้า Paper Trading

- **Route:** `/paper-trading`
- **บทบาทของหน้า:** หน้าจัดการ paper trading sessions

## เป้าหมายของหน้า
ใช้จัดการ session paper trading ทั้งหมดในระบบ ดูสถานะ, equity, P&L, position ปัจจุบัน, และสั่ง start/stop/delete หรือเข้าไปดูรายละเอียดแต่ละ session

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
เปิดหน้านี้เมื่อคุณต้องการ monitor ว่า strategy ใดกำลังรัน paper อยู่, performance เป็นอย่างไร, และควรหยุด/เริ่ม session ไหนต่อ

## หน้านี้มีอะไรบ้าง
- cards ของแต่ละ session พร้อม strategy id, symbol, interval, status
- equity, P&L, position summary
- actions: **View**, **Start/Stop**, **Delete**
- auto-refresh ทุก 5 วินาที

## ปุ่มและการโต้ตอบสำคัญ
- **Create Session** → ไปหน้า `/paper-trading/new`
- **Start / Stop** → ควบคุมการรัน session
- **Delete** → ลบ session ออกจากระบบ
- **View** → เข้า detail ของ session นั้น

## วิธีใช้งานที่แนะนำ
1. ใช้หน้านี้เป็น mission control สำหรับ paper strategies ที่กำลังรันอยู่
2. เช็ก status และ P&L ก่อนจะเข้า detail report
3. ถ้าจะหยุดหลาย session ให้ประเมินก่อนว่าเกิดจาก market regime เปลี่ยนหรือ strategy drift

## มุมมองแบบ OI Trader
paper trading ไม่ได้มีไว้เพื่อพิสูจน์ว่าคุณถูกเสมอ แต่มันช่วยเช็กว่า strategy ยังอยู่รอดใน live feed ได้หรือไม่ หน้านี้จึงควรใช้ติดตาม operational fitness มากกว่าดูแค่กำไรขาดทุน momentarily

## ข้อควรระวัง
- P&L ที่ดีช่วงสั้นไม่พอจะสรุป edge
- การลบ session ทำให้การทบทวนภายหลังยากขึ้น ควรแน่ใจก่อน delete
- position ปัจจุบันควรอ่านร่วมกับ detail page เพื่อดู path และ history

## หน้าที่เกี่ยวข้อง
- [`/paper-trading/new`](./new/README.md)
- [`/paper-trading/[id]`](./[id]/README.md)
