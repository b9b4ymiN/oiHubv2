# คู่มือหน้า OI Heatmap

- **Route:** `/heatmap/oi`
- **บทบาทของหน้า:** หน้าดูแผนที่การสะสม/กระจาย OI ตามระดับราคา

## เป้าหมายของหน้า
ใช้ดูว่า OI เปลี่ยนแปลงที่ระดับราคาไหนบ้างตลอดช่วงเวลา เพื่อหา accumulation zones, distribution zones, และ price levels ที่ market สนใจมากที่สุด

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
เปิดหน้านี้เมื่อคุณต้องการตอบว่า:
- OI build อยู่บริเวณราคาไหน
- support/resistance เชิง positioning อยู่ตรงไหน
- move ปัจจุบันเป็น acceptance หรือ rejection รอบระดับสำคัญ

## หน้านี้มีอะไรบ้าง
- analytics cards เช่น **Net OI Bias**, **Top Accumulation**, **Top Distribution**, **Active Price Levels**
- heatmap matrix ที่จับคู่ `price buckets` กับ `time buckets`
- hot zones สำหรับระดับราคาที่มี activity สูงสุด

## ปุ่มและการโต้ตอบสำคัญ
- **Symbol selector**
- **Interval selector**
- **Price step selector** เพื่อเปลี่ยนความละเอียดของ bucket
- ใช้ร่วมกับ Theme toggle ตาม preference การมอง chart

## วิธีใช้งานที่แนะนำ
1. เริ่มจาก Net OI Bias เพื่อรู้ภาพรวม 24h ก่อน
2. ดู top accumulation/distribution ว่าอยู่เหนือหรือใต้ current price
3. ดู hot zones 3 อันดับแรก แล้วเทียบกับ structure จาก dashboard/orderbook
4. ถ้า price กำลัง approach zone สำคัญ ให้เตรียม scenario ล่วงหน้า

## มุมมองแบบ OI Trader
heatmap นี้ควรใช้เป็น **map of interest**, ไม่ใช่ trigger เดี่ยว ถ้าเห็น OI build หนาแน่นที่ระดับหนึ่ง ให้ถามต่อว่า build นั้น support continuation หรือเป็น trap candidate ต้องใช้ dashboard/intelligence ช่วย confirm

## ข้อควรระวัง
- priceStep ที่หยาบเกินไปจะซ่อนรายละเอียด; ละเอียดเกินไปจะ noisy
- net bias บอกภาพรวม แต่ไม่ได้บอก timing entry
- อย่าอ่านสีอย่างเดียว ต้องดูตำแหน่ง relative กับ price ปัจจุบันด้วย

## หน้าที่เกี่ยวข้อง
- [`/dashboard`](../../dashboard/README.md)
- [`/orderbook`](../../orderbook/README.md)
