# คู่มือหน้า Orderbook Depth

- **Route:** `/orderbook`
- **บทบาทของหน้า:** หน้าวิเคราะห์ microstructure และ liquidity

## เป้าหมายของหน้า
ใช้ดู depth ของ orderbook แบบ real-time เพื่อประเมิน liquidity, spread, imbalance, และ liquidity walls ที่อาจทำให้ราคาเกิด reaction ระยะสั้น

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
เปิดหน้านี้เมื่อคุณต้องการ refine execution context เช่น:
- จุดเข้าใกล้ wall หรือยัง
- ตลาดบางหรือหนาพอสำหรับ size ที่ต้องการหรือไม่
- short-term imbalance สนับสนุน bias จาก dashboard หรือไม่

## หน้านี้มีอะไรบ้าง
- quick stats: best bid, best ask, mid price, auto-refresh
- **Orderbook Ladder (DOM)**
- **Cumulative Depth Visualization**
- **LiquidityMetricsPanel**
- **LiquidityWalls**
- educational guide ด้านล่างสำหรับการอ่านหน้าจอ

## ปุ่มและการโต้ตอบสำคัญ
- **Symbol selector**
- **Depth levels selector**
- **Refresh button**
- auto-refresh ทุก 5 วินาที

## วิธีใช้งานที่แนะนำ
1. เริ่มจาก liquidity metrics เพื่อดู imbalance และ spread ก่อน
2. ดู ladder เพื่อหา wall ใกล้ current price
3. ดู cumulative depth เพื่อประเมิน slippage / liquidity density
4. ใช้ข้อมูลนี้เพื่อปรับ timing ของ entry/exit ไม่ใช่เพื่อเปลี่ยน thesis ใหญ่เพียงลำพัง

## มุมมองแบบ OI Trader
orderbook เป็นข้อมูลที่เปลี่ยนเร็วและ spoof ได้ จึงเหมาะกับการ fine-tune execution มากกว่าการสร้าง swing thesis ใหม่ ถ้า macro bias จาก dashboard ชัดอยู่แล้ว หน้านี้ช่วยหาจังหวะและจุดที่ไม่ควรไล่ราคา

## ข้อควรระวัง
- large wall อาจถูกถอนออกได้
- auto-refresh 5 วินาทีไม่เท่ากับ full tick-by-tick tape
- ใช้สำหรับ microstructure context ไม่ใช่แทน higher-timeframe analysis

## หน้าที่เกี่ยวข้อง
- [`/dashboard`](../dashboard/README.md)
- [`/heatmap/oi`](../heatmap/oi/README.md)
