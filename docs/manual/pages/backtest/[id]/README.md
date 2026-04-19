# คู่มือหน้ารายงาน Backtest

- **Route:** `/backtest/[id]`
- **บทบาทของหน้า:** หน้าทบทวนผลลัพธ์หลังรัน backtest

## เป้าหมายของหน้า
ใช้สรุปผลลัพธ์ของ backtest ที่รันเสร็จแล้ว พร้อม configuration, metrics, equity curve, signal breakdown, trades table, และ export CSV

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
เปิดหน้านี้เมื่อคุณต้องการตัดสินว่า strategy/config นี้ควร:
- ทดสอบต่อ
- ปรับ parameter
- ส่งต่อไป paper trading
- หรือ discard ทิ้ง

## หน้านี้มีอะไรบ้าง
- **Configuration summary** เพื่อเช็กว่ารันสิ่งที่ตั้งใจจริง
- **SummaryCard** สำหรับ metric หลัก
- **EquityCurveChart** สำหรับ path ของผลตอบแทน
- **SignalBreakdown** เพื่อดูว่า signal ไหนสร้าง/ทำลาย edge
- **TradeList** สำหรับ forensic review รายไม้
- ปุ่ม **Export CSV**, **Back**, **Re-run**

## ปุ่มและการโต้ตอบสำคัญ
- **Export CSV** ใช้ส่งออกผลไปวิเคราะห์ต่อ
- **Re-run** จะเติม query กลับไปหน้า backtest/new ด้วย config เดิม
- ถ้ามี lookahead violations ให้ถือเป็น warning สำคัญระดับ model integrity

## วิธีใช้งานที่แนะนำ
1. อ่าน configuration ก่อนทุกครั้ง เพื่อกันการตีความผลผิดชุด
2. ดู equity curve ก่อน summary metrics เสมอ
3. ดู signal breakdown เพื่อหาว่า edge มาจากอะไรจริง
4. ลงไป trade list เมื่อมี anomaly เช่น DD แปลก, PF สูงผิดธรรมชาติ, หรือ win rate ไม่สมเหตุผล

## มุมมองแบบ OI Trader
report ที่ดีไม่ใช่ report ที่สวยที่สุด แต่คือ report ที่ยังน่าเชื่อถือหลังคุณพยายามหาจุดอ่อนของมันแล้ว หากเห็น lookahead violation, sample size เล็ก, หรือ equity curve เปราะ ให้ลดน้ำหนักผลทันที

## ข้อควรระวัง
- sample size ต่ำทำให้ metric หลอกตาได้มาก
- equity curve เรียบเกินจริงอาจมาจาก parameter fit หรือ market subset ที่ง่ายเกินไป
- ใช้ report เพื่อเตรียม paper test ไม่ใช่กระโดดข้ามขั้น

## หน้าที่เกี่ยวข้อง
- [`/backtest/new`](../new/README.md)
- [`/paper-trading/new`](../../paper-trading/new/README.md)
