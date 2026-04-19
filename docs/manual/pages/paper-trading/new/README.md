# คู่มือหน้าสร้าง Paper Trading Session

- **Route:** `/paper-trading/new`
- **บทบาทของหน้า:** ฟอร์มสร้าง paper trading session

## เป้าหมายของหน้า
ใช้สร้าง session paper trading ใหม่จาก strategy ที่มีอยู่ โดยกำหนด symbol, interval, initial capital, leverage, และ fill model settings

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
เหมาะเมื่อคุณผ่านขั้น backtest แล้ว และต้องการทดสอบ behavior ของ strategy บน live market feed แบบไม่มีเงินจริงเกี่ยวข้อง

## หน้านี้มีอะไรบ้าง
- เลือก **strategy** จากรายการที่เปิดใช้ได้
- ตั้ง **symbol / interval / initial capital / leverage**
- เปิด **Advanced Fill Model Settings** เพื่อปรับ slippage, fees, funding
- เมื่อสร้างสำเร็จจะ redirect ไปหน้า detail ของ session

## ปุ่มและการโต้ตอบสำคัญ
- สามารถรับ query params จากที่อื่นเพื่อ prefill ค่าได้
- **Advanced settings** สำคัญมากถ้าต้องการ realism สูงขึ้น
- **Submit** จะสร้าง session ผ่าน `/api/paper-trading`

## วิธีใช้งานที่แนะนำ
1. ใช้ config ที่ผ่านการเรียนรู้จาก backtest มาก่อนแล้ว
2. ตั้ง leverage และ fees ให้ใกล้โลกจริง ไม่ใช่เพื่อทำตัวเลขสวย
3. สร้าง session แล้วเริ่ม monitor จาก detail page ทันที

## มุมมองแบบ OI Trader
paper session ที่ดีควรจำลอง friction ให้สมจริงพอ มิฉะนั้นคุณจะได้ false confidence ก่อนถึง phase การเทรดจริงในอนาคต หน้านี้จึงเป็นจุดสำคัญของ **simulation integrity**

## ข้อควรระวัง
- leverage สูงทำให้ผล paper ผันผวนจนอ่าน edge ยาก
- advanced fill model ที่ง่ายเกินไปจะทำให้ผล optimistic
- อย่าเปิดหลาย session clone กันโดยไม่มี hypothesis แยก

## หน้าที่เกี่ยวข้อง
- [`/paper-trading`](../README.md)
- [`/paper-trading/[id]`](../[id]/README.md)
- [`/backtest/new`](../../backtest/new/README.md)
