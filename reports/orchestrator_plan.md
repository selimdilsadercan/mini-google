# 🛰️ Mini-Google Orchestrator: Strategic Roadmap

## 📊 Current Assessment
Lead Developer'ın sistem raporu kritik bir açığı ortaya çıkardı: **Resilience Lack (Dayanıklılık Eksikliği).** Crawler işleri şu an bellekteki `Map` üzerinde yaşıyor. Sistem kapandığında %99'u tamamlanmış bir tarama bile çöp oluyor. UI tarafında ise görsel temel tamamlanmış olsa da, sunulan verinin kalitesini (search relevancy) artırmamız gerekiyor.

---

## 🛠️ Task Assignments (Görev Dağılımı)

### 👨‍💻 [DEV-AGENT] - Priority: CRITICAL
**Mission: System Hardening & Intelligence**
1.  **Job Persistence:** `CrawlerManager` içindeki `Map` yapısını kaldırıp, SQLite üzerinden yönet.
2.  **Auto-Resume:** Sunucu başladığında `running` işleri otomatik ayağa kaldır.
3.  **BM25 Integration:** Arama kalitesini SQLite rank ile güçlendir.
4.  **Content Refinement:** (Seeding-Agent açılana kadar) Boilerplate temizliği ve `<main>` tag önceliği.

### 🎨 [DESIGN-AGENT] - Priority: HIGH
**Mission: Visual Excellence & Analytics**
1.  **Metrics Visualization:** Dashboard'a canlı hit-rate ve kuyruk derinliği grafikleri ekle.
2.  **Search Feedback:** Arama sırasında "Agentic" ilerleme durumunu gösteren mikro-animasyonlar.
3.  **Theme System:** Mevcut Glassmorphism'i destekleyen dinamik "High-Contrast" modu.

### 🌱 [SEEDING-AGENT] - OPTIONAL (PENDING USER APPROVAL)
**Mission: Data Ecosystem**
- Kaliteli URL listeleri ve veri temizliği stratejileri.

---

## 📅 Timeline & Milestones
- **M1: Persistence (24h):** Çökme anında veri kaybının sıfıra inmesi.
- **M2: Intelligence (48h):** Arama sonuçlarının anlamlılık sırasına göre gelmesi.
- **M3: Scale (72h):** 10.000+ sayfa indexlendiğinde bile milisaniye seviyesinde arama hızı.

---
*Orchestrator tarafından onaylanmıştır.*
