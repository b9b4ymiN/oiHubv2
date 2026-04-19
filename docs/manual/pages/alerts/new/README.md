# คู่มือหน้าสร้าง Alert

- **Route:** `/alerts/new`
- **บทบาทของหน้า:** ฟอร์มสร้างกฎแจ้งเตือน

## เป้าหมายของหน้า
ใช้สร้าง alert rule ใหม่ โดยกำหนดชื่อ, symbol, interval, severity, เงื่อนไข, channel, throttle, และ quiet hours

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
เหมาะเมื่อคุณรู้แล้วว่าอยากถูกแจ้งเตือนเรื่องอะไร เช่น OI divergence, regime shift, funding extreme, หรือ liquidation cluster

## หน้านี้มีอะไรบ้าง
- ส่วน **Basic Information** สำหรับ metadata ของ rule
- ส่วน **Conditions** สำหรับกำหนดตรรกะเชิงสัญญาณ
- ส่วน **Channels** เพื่อเลือก toast/push/telegram/discord/email
- ส่วน **Throttle / Quiet Hours** เพื่อควบคุม noise และเวลาพัก

## ปุ่มและการโต้ตอบสำคัญ
- **Template query param** สามารถ preload เงื่อนไขจากหน้า list ได้
- **Condition Groups**: แต่ละกลุ่มรวมกันแบบ OR และภายในกลุ่มใช้ AND/OR ได้ตามที่เลือก
- **Channel toggles**: เปิดเฉพาะช่องทางที่พร้อมใช้งานจริง
- **Save/Create**: บันทึก rule ใหม่แล้วกลับไป list

## วิธีใช้งานที่แนะนำ
1. ตั้งชื่อให้สื่อสารได้ชัด เช่น `BTC 15m OI Divergence Critical`
2. กำหนดเงื่อนไขให้แคบพอที่จะ action ได้ ไม่กว้างเกินจนดังทั้งวัน
3. ตั้ง throttle ก่อนเปิดใช้งานจริง
4. ถ้าคุณมีช่วงพัก/นอน ให้เปิด quiet hours เสมอ

## มุมมองแบบ OI Trader
logic ของ alert ควรสะท้อน process ตัดสินใจของคุณจริง ๆ ถ้าปกติคุณต้องดู OI + regime + funding พร้อมกัน ก็ควร encode แบบนั้น อย่าตั้ง alert แบบ single-factor แล้วคาดหวังคุณภาพระดับ multi-factor

## ข้อควรระวัง
- การใช้ symbol แบบพิมพ์เอง ต้องตรวจความถูกต้องของ market code
- ถ้าตั้ง threshold ต่ำเกินไปจะได้ false positives จำนวนมาก
- quiet hours ที่ suppress severity ผิดอาจทำให้พลาด alert สำคัญ

## หน้าที่เกี่ยวข้อง
- [`/alerts`](../README.md)
- [`/alerts/[id]`](../[id]/README.md)
