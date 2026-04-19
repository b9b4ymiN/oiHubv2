# คู่มือหน้ารายละเอียด Paper Trading Session

- **Route:** `/paper-trading/[id]`
- **บทบาทของหน้า:** หน้าตรวจสอบ paper trading session รายตัว

## เป้าหมายของหน้า
ใช้ติดตาม session paper trading รายตัวแบบละเอียด ทั้งสถานะการรัน, config, equity curve, trades, error state, และ action control ระดับ session

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
เปิดหน้านี้เมื่อคุณต้องการตอบว่า session นี้ยังทำงานตามที่คาดหวังหรือไม่, ควรปล่อยให้รันต่อ, หยุด, หรือลบทิ้ง

## หน้านี้มีอะไรบ้าง
- session header พร้อม status/action buttons
- **Session Configuration** รวม symbol, interval, capital, leverage, bars processed, timestamps
- **EquityCurveChart**
- **TradeList**
- error section หาก session ล้มเหลว
- polling ทุก 5 วินาทีถ้า session ยัง running

## ปุ่มและการโต้ตอบสำคัญ
- **Start / Stop** session
- **Delete** session
- กลับไปหน้า list ได้ผ่าน back link
- เมื่อ session running จะ refresh อัตโนมัติ

## วิธีใช้งานที่แนะนำ
1. ดู status และ bars processed ก่อน
2. อ่าน equity curve เพื่อดู path ไม่ใช่ดูแค่ P&L สุดท้าย
3. ไล่ trade list เพื่อดูว่า strategy เข้าออกตาม thesis หรือไม่
4. ถ้ามี error ให้ประเมินว่าเป็น data issue, config issue, หรือ strategy issue ก่อน restart

## มุมมองแบบ OI Trader
นี่คือหน้าที่เชื่อมโลก backtest เข้ากับโลกตลาดจริงแบบปลอดเงินจริง ถ้า behavior ของ session ต่างจากสิ่งที่ backtest เคยบอกมาก หน้านี้คือที่ที่คุณจะจับ divergence นั้นได้ก่อนเสีย capital จริง

## ข้อควรระวัง
- polling ช่วยติดตาม state แต่ไม่ใช่ replay tick-by-tick เต็มรูปแบบ
- อย่าตัดสิน strategy จากช่วงสั้นเกินไป
- การ restart session โดยไม่เข้าใจ error จะทำให้ diagnosis ยากขึ้น

## หน้าที่เกี่ยวข้อง
- [`/paper-trading`](../README.md)
- [`/paper-trading/new`](../new/README.md)
- [`/backtest/[id]`](../../backtest/[id]/README.md)
