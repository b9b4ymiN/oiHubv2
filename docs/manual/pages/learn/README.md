# คู่มือหน้า Learn / Academy

- **Route:** `/learn`
- **บทบาทของหน้า:** หน้าเรียนรู้และ onboarding

## เป้าหมายของหน้า
หน้าเรียนรู้ใช้สอนผู้ใช้ให้เข้าใจการอ่าน options volume, open interest, implied volatility, และ chart tutorial แบบ step-by-step ก่อนจะไปใช้หน้าจริง

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
เหมาะกับผู้ใช้ใหม่หรือผู้ใช้ที่ยังไม่แม่น options/IV visualization และต้องการเรียนแบบ guided tutorial โดยใช้ data จริงของ BTC options

## หน้านี้มีอะไรบ้าง
- welcome card ที่อธิบายโครงสร้าง tutorial
- chart tutorial area ที่โหลด `OptionsVolumeIVChart`
- learning path preview แบบ 9 ขั้น
- CTA กลับ home หรือไป dashboard

## ปุ่มและการโต้ตอบสำคัญ
- tutorial ใช้ navigation controls ใน chart component
- ถ้าโหลด data ไม่ได้ จะมี retry state
- ถ้าพร้อมใช้งานจริง ให้กดไป dashboard หลังเรียนจบ

## วิธีใช้งานที่แนะนำ
1. อ่าน welcome section เพื่อรู้ว่าจะได้อะไรจาก tutorial นี้
2. เดิน tutorial ทีละ step อย่าข้ามไปดูผลลัพธ์รวดเดียว
3. เมื่อตีความ chart เริ่มคล่องแล้ว ค่อยขยับไปหน้า dashboard/options pages

## มุมมองแบบ OI Trader
หน้า learn สำคัญเพราะช่วยลดการอ่าน chart ผิดตั้งแต่ต้น โดยเฉพาะผู้ที่มาจาก futures/OI ฝั่งเดียวและยังไม่คุ้น options context การเข้าใจ IV และ strike distribution จะช่วยให้การอ่าน confluence ดีขึ้น

## ข้อควรระวัง
- หาก API data ล่ม หน้านี้อาจไม่โหลด tutorial เต็มรูปแบบ
- หน้านี้มีเป้าหมายเพื่อการศึกษา ไม่ใช่ signal engine

## หน้าที่เกี่ยวข้อง
- [`/`](../home/README.md)
- [`/dashboard`](../dashboard/README.md)
- [`/options-volume`](../options-volume/README.md)
