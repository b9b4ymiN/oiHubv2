# คู่มือหน้าสร้าง Backtest

- **Route:** `/backtest/new`
- **บทบาทของหน้า:** หน้าตั้งค่าการทดสอบย้อนหลัง

## เป้าหมายของหน้า
ใช้ตั้งค่าการรัน backtest แบบ historical replay เพื่อทดสอบ strategy กับ symbol, timeframe, date range, capital, และ fill model ที่ต้องการ

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
เปิดหน้านี้เมื่อคุณต้องการตอบคำถามว่า strategy หนึ่ง ๆ มีพฤติกรรมอย่างไรในข้อมูลย้อนหลัง ก่อนจะเชื่อมันใน paper trading หรือการใช้งานจริงในอนาคต

## หน้านี้มีอะไรบ้าง
- เลือก strategy ที่มีอยู่ในระบบ
- ตั้ง symbol / interval / start date / end date
- ปรับ strategy params ตาม schema ของแต่ละ strategy
- ส่วน advanced สำหรับ slippage, fees, funding และ fill behavior

## ปุ่มและการโต้ตอบสำคัญ
- **Quick date range** (ถ้ามีใน form) ช่วยตั้งช่วงทดสอบเร็วขึ้น
- **Strategy parameters** เปลี่ยน logic/behavior ของ strategy
- **Submit** จะยิงไป `/api/backtest/run` และ poll สถานะจนเสร็จ ก่อน redirect ไปหน้า report

## วิธีใช้งานที่แนะนำ
1. เลือกช่วงเวลาที่มี regime หลากหลาย ไม่ใช่เลือกเฉพาะช่วงที่เข้าทาง strategy
2. ตั้ง fees/slippage ให้สมจริงพอ ไม่ optimistic เกินไป
3. เปลี่ยน parameter ทีละชุดและจดผลลัพธ์อย่างมีระบบ
4. ใช้ report page ในการเทียบผลหลายรอบ

## มุมมองแบบ OI Trader
backtest เป็นเครื่องมือสำหรับ **falsify ความเชื่อ** มากกว่ายืนยันความมั่นใจ ดังนั้นควรใช้หน้านี้เพื่อหาเงื่อนไขที่ strategy พัง, drawdown สูง, หรือ brittle ต่อ regime change

## ข้อควรระวัง
- อย่าปรับจนกลายเป็น overfit กับช่วงเวลาแคบ ๆ
- date range ที่สั้นเกินไปจะทำให้ metric หลอกตา
- ผล backtest ไม่ใช่คำสั่ง trade; ต้องผ่าน paper trading อีกชั้นหนึ่ง

## หน้าที่เกี่ยวข้อง
- [`/backtest/[id]`](../[id]/README.md)
- [`/paper-trading/new`](../../paper-trading/new/README.md)
