# คู่มือการใช้งานรายหน้า

คู่มือชุดนี้ออกแบบสำหรับ **เทรดเดอร์สาย Open Interest (OI)** และผู้ดูแลระบบที่ต้องการเข้าใจว่าแต่ละหน้าใน `oiHubv2` ใช้ทำอะไร, ควรเปิดเมื่อไร, และควรตีความข้อมูลอย่างไรให้ตรงกับขอบเขตของระบบปัจจุบัน

> ขอบเขตปัจจุบัน: `oiHubv2` ยังเป็น **แพลตฟอร์มวิเคราะห์แบบ read-only** สำหรับ analysis, alerts, backtest และ paper trading เท่านั้น ยัง **ไม่รองรับ live execution** หรือการเก็บ trading keys สำหรับส่งคำสั่งจริง

## สารบัญ
- [วิธีใช้คู่มือชุดนี้](#วิธีใช้คู่มือชุดนี้)
- [สารบัญตาม workflow](#สารบัญตาม-workflow)
  - [1) เริ่มต้นทำความเข้าใจระบบ](#1-เริ่มต้นทำความเข้าใจระบบ)
  - [2) ทำงานจาก cockpit หลัก](#2-ทำงานจาก-cockpit-หลัก)
  - [3) ตั้งระบบแจ้งเตือน](#3-ตั้งระบบแจ้งเตือน)
  - [4) ทดสอบย้อนหลัง](#4-ทดสอบย้อนหลัง)
  - [5) วิเคราะห์เชิงลึกเฉพาะด้าน](#5-วิเคราะห์เชิงลึกเฉพาะด้าน)
  - [6) Paper Trading](#6-paper-trading)
- [ลำดับการอ่านที่แนะนำ](#ลำดับการอ่านที่แนะนำ)
- [หมายเหตุการใช้งาน](#หมายเหตุการใช้งาน)

## วิธีใช้คู่มือชุดนี้
- ถ้าคุณเพิ่งเข้าระบบ: เริ่มจาก **หน้าแรก** และ **Dashboard**
- ถ้าคุณต้องการหาจังหวะเข้าเทรด: ใช้ **Dashboard → Intelligence → Heatmap / Orderbook / Options**
- ถ้าคุณต้องการให้ระบบช่วยเฝ้า setup: ไปที่กลุ่ม **Alerts**
- ถ้าคุณต้องการตรวจ logic ของ strategy: ไปที่กลุ่ม **Backtest**
- ถ้าคุณต้องการทดสอบบน live feed แบบไม่ใช้เงินจริง: ไปที่กลุ่ม **Paper Trading**

## สารบัญตาม workflow

### 1) เริ่มต้นทำความเข้าใจระบบ
- [`/` → คู่มือหน้าแรก](./pages/home/README.md)
- [`/learn` → คู่มือหน้า Learn / Academy](./pages/learn/README.md)

### 2) ทำงานจาก cockpit หลัก
- [`/dashboard` → คู่มือหน้า Dashboard](./pages/dashboard/README.md)
- [`/intelligence` → คู่มือหน้า Intelligence Center](./pages/intelligence/README.md)

### 3) ตั้งระบบแจ้งเตือน
- [`/alerts` → คู่มือหน้า Alert Rules](./pages/alerts/README.md)
- [`/alerts/new` → คู่มือหน้าสร้าง Alert](./pages/alerts/new/README.md)
- [`/alerts/[id]` → คู่มือหน้าแก้ไข Alert](./pages/alerts/[id]/README.md)

### 4) ทดสอบย้อนหลัง
- [`/backtest/new` → คู่มือหน้าสร้าง Backtest](./pages/backtest/new/README.md)
- [`/backtest/[id]` → คู่มือหน้ารายงาน Backtest](./pages/backtest/[id]/README.md)

### 5) วิเคราะห์เชิงลึกเฉพาะด้าน
- [`/heatmap/oi` → คู่มือหน้า OI Heatmap](./pages/heatmap/oi/README.md)
- [`/options-pro` → คู่มือหน้า Professional Options Flow](./pages/options-pro/README.md)
- [`/options-volume` → คู่มือหน้า Options Volume Analysis](./pages/options-volume/README.md)
- [`/orderbook` → คู่มือหน้า Orderbook Depth](./pages/orderbook/README.md)

### 6) Paper Trading
- [`/paper-trading` → คู่มือหน้า Paper Trading](./pages/paper-trading/README.md)
- [`/paper-trading/new` → คู่มือหน้าสร้าง Paper Trading Session](./pages/paper-trading/new/README.md)
- [`/paper-trading/[id]` → คู่มือหน้ารายละเอียด Paper Trading Session](./pages/paper-trading/[id]/README.md)

## ลำดับการอ่านที่แนะนำ
1. หน้าแรก
2. Dashboard
3. Intelligence Center
4. เลือกหน้าเฉพาะทางตามสไตล์ที่ใช้จริง
   - OI map → Heatmap
   - microstructure → Orderbook
   - options context → Options Pro / Options Volume
5. Alerts
6. Backtest
7. Paper Trading

## หมายเหตุการใช้งาน
- คู่มือชุดนี้เน้น **การใช้งานระดับหน้า (page-level)** ไม่ได้แทนเอกสารเชิง logic ของแต่ละ card
- หากต้องการเข้าใจ signal math หรือ feature ภายใน ให้ดูเอกสารใน `docs/cards/` และ `docs/OI-MOMENTUM-GUIDE.md`
- หาก UI เปลี่ยน route หรือ flow ในอนาคต ควรอัปเดตคู่มือชุดนี้ตาม route จริงเสมอ
