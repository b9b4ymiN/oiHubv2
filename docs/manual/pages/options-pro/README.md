# คู่มือหน้า Professional Options Flow

- **Route:** `/options-pro`
- **บทบาทของหน้า:** หน้าวิเคราะห์ options positioning ระดับ professional

## เป้าหมายของหน้า
ใช้วิเคราะห์ options flow แบบ professional-grade โดยดู gamma exposure, delta exposure, call/put walls, และ positioning levels ที่มีผลต่อ volatility regime และ dealer hedge pressure

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
เปิดหน้านี้เมื่อคุณต้องการรู้ว่า options market กำลังกด/หนุนการเคลื่อนไหวของราคาอย่างไร โดยเฉพาะในบริบทของ gamma walls และ support/resistance จาก open interest

## หน้านี้มีอะไรบ้าง
- **ProOptionsFlowSummary**
- **GammaExposureChart**
- **DeltaExposureChart**
- **StrikeDistributionTable**
- สรุป **Top Call Walls** และ **Top Put Walls**

## ปุ่มและการโต้ตอบสำคัญ
- **Underlying selector** เช่น BTC/ETH/BNB/SOL
- **Expiry selector** เพื่อเปลี่ยน expiry bucket
- **Retry** เมื่อ API/error state เกิดขึ้น
- ลิงก์ไป `/api/options/test` ใน no-data state เพื่อช่วย debug data source

## วิธีใช้งานที่แนะนำ
1. เริ่มจาก summary เพื่อรู้ gamma regime และ net delta exposure
2. ดู gamma chart ก่อนว่า market อยู่ใน regime ที่ suppress หรือ amplify move
3. ดู delta exposure เพื่อประเมิน hedge pressure
4. ใช้ call/put walls เพื่อเทียบกับ zone จาก dashboard/heatmap

## มุมมองแบบ OI Trader
หน้านี้ช่วยตอบว่า options dealers อาจกลายเป็นแรงดูดหรือแรงผลักของราคาในช่วงไหน ถ้า futures OI setup ดีแต่ options wall อยู่ใกล้มาก คุณควรระวัง reaction ที่ไม่ไปตาม expected trend

## ข้อควรระวัง
- หน้านี้อาศัย data availability ตาม underlying/expiry ที่เลือก
- wall ใหญ่ไม่ได้แปลว่าราคาจะหยุดทุกครั้ง แต่เป็นระดับที่ควรเฝ้าปฏิกิริยา
- อย่าอ่าน gamma/delta แบบแยกขาดจาก spot/futures context

## หน้าที่เกี่ยวข้อง
- [`/options-volume`](../options-volume/README.md)
- [`/dashboard`](../dashboard/README.md)
